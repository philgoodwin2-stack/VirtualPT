import asyncio
from contextlib import suppress
from fastapi import (
    FastAPI,
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Response,
)
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, IndexModel, ReturnDocument
import os
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

try:  # launched as `backend.server` (the default)
    from backend.clerk_auth import clerk_router, require_user
except ModuleNotFoundError:  # launched from inside backend/ as `server`
    from clerk_auth import clerk_router, require_user

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

INDEXES: dict[str, list[IndexModel]] = {
    "exercises": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel(
            [("user_id", ASCENDING), ("day", ASCENDING), ("created_at", ASCENDING)],
            name="user_day",
        ),
    ],
    "photos": [
        IndexModel([("storage_path", ASCENDING)], name="storage_path", unique=True),
    ],
    "week_completions": [
        IndexModel(
            [("user_id", ASCENDING), ("week_start", ASCENDING)],
            name="user_week",
            unique=True,
        ),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logging.getLogger(__name__).error(
                    "ensure_indexes(%s.%s): %s", collection, model.document["name"], exc
                )


# ---------- Object storage ----------
STORAGE_BASE = (
    os.environ.get("INTEGRATION_PROXY_URL") or ""
).strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "weekly-reps"
storage_key = None
ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_PHOTO_BYTES = 8 * 1024 * 1024


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    print("EMERGENT_KEY =", repr(EMERGENT_KEY))
    resp = requests.post(
        f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30
    )
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class Exercise(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    sets: int
    reps: str
    photo_path: Optional[str] = None
    completed: bool = False
    sets_done: Optional[int] = None
    created_at: str

    def model_post_init(self, __context):
        # Older records have no per-set progress: derive it from the tick.
        if self.sets_done is None:
            self.sets_done = self.sets if self.completed else 0


class ExerciseCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    day: int = Field(ge=0, le=6)
    name: str = Field(min_length=1, max_length=60)
    sets: int = Field(ge=1, le=99)
    reps: str = Field(min_length=1, max_length=20)
    photo_path: Optional[str] = None


class ExerciseUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    day: Optional[int] = Field(default=None, ge=0, le=6)
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    sets: Optional[int] = Field(default=None, ge=1, le=99)
    reps: Optional[str] = Field(default=None, min_length=1, max_length=20)
    photo_path: Optional[str] = None
    remove_photo: bool = False
    completed: Optional[bool] = None
    sets_done: Optional[int] = Field(default=None, ge=0, le=99)


async def _check_photo_owner(path: Optional[str], user_id: str):
    if path and not await db.photos.find_one(
        {"storage_path": path, "user_id": user_id, "is_deleted": False}
    ):
        raise HTTPException(status_code=400, detail="Unknown photo")


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


async def _record_week_if_done(user_id: str):
    # Logs this calendar week as finished once every planned exercise is ticked.
    if not await db.exercises.find_one({"user_id": user_id}, {"_id": 1}):
        return
    if await db.exercises.find_one(
        {"user_id": user_id, "completed": False}, {"_id": 1}
    ):
        return
    week = _week_start(datetime.now(timezone.utc).date()).isoformat()
    await db.week_completions.update_one(
        {"user_id": user_id, "week_start": week},
        {
            "$setOnInsert": {
                "user_id": user_id,
                "week_start": week,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )


@api_router.get("/streak")
async def get_streak(user: dict = Depends(require_user)):
    docs = await db.week_completions.find(
        {"user_id": user["user_id"]}, {"_id": 0, "week_start": 1}
    ).to_list(1000)
    weeks = {d["week_start"] for d in docs}
    current = _week_start(datetime.now(timezone.utc).date())
    logged = current.isoformat() in weeks
    cursor = current if logged else current - timedelta(days=7)
    streak = 0
    while cursor.isoformat() in weeks:
        streak += 1
        cursor -= timedelta(days=7)
    open_left = await db.exercises.find_one(
        {"user_id": user["user_id"], "completed": False}, {"_id": 1}
    )
    return {
        "streak": streak,
        "this_week_done": logged and not open_left,
        "best": _best_run(weeks),
    }


def _best_run(weeks: set) -> int:
    best = 0
    for w in weeks:
        d = date.fromisoformat(w)
        if (d - timedelta(days=7)).isoformat() in weeks:
            continue
        run = 0
        while d.isoformat() in weeks:
            run += 1
            d += timedelta(days=7)
        best = max(best, run)
    return best


# ---------- Exercise routes ----------
@api_router.get("/exercises", response_model=List[Exercise])
async def list_exercises(user: dict = Depends(require_user)):
    return (
        await db.exercises.find({"user_id": user["user_id"]}, {"_id": 0})
        .sort("created_at", 1)
        .to_list(1000)
    )


@api_router.post("/exercises", response_model=Exercise)
async def create_exercise(body: ExerciseCreate, user: dict = Depends(require_user)):
    await _check_photo_owner(body.photo_path, user["user_id"])
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        **body.model_dump(),
        "name": body.name.strip(),
        "reps": body.reps.strip(),
        "completed": False,
        "sets_done": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.exercises.insert_one(doc)
    return Exercise(**doc)


@api_router.patch("/exercises/{exercise_id}", response_model=Exercise)
async def update_exercise(
    exercise_id: str, body: ExerciseUpdate, user: dict = Depends(require_user)
):
    changes = body.model_dump(exclude_none=True, exclude={"remove_photo"})
    if "photo_path" in changes:
        await _check_photo_owner(changes["photo_path"], user["user_id"])
    if body.remove_photo:
        changes["photo_path"] = None
    if not changes:
        raise HTTPException(status_code=400, detail="Nothing to update")
    current = await db.exercises.find_one(
        {"id": exercise_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not current:
        raise HTTPException(status_code=404, detail="Not found")
    total = changes.get("sets", current["sets"])
    if "sets_done" in changes:
        done = min(changes["sets_done"], total)
    elif "completed" in changes:
        done = total if changes["completed"] else 0
    else:
        done = min(Exercise(**current).sets_done, total)
    changes["sets_done"] = done
    changes["completed"] = done >= total
    doc = await db.exercises.find_one_and_update(
        {"id": exercise_id, "user_id": user["user_id"]},
        {"$set": changes},
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["completed"]:
        await _record_week_if_done(user["user_id"])
    return Exercise(**doc)


@api_router.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: str, user: dict = Depends(require_user)):
    res = await db.exercises.delete_one({"id": exercise_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await _record_week_if_done(user["user_id"])
    return {"ok": True}


class CopyDay(BaseModel):
    from_day: int = Field(ge=0, le=6)
    to_days: List[int] = Field(min_length=1, max_length=6)


@api_router.post("/exercises/copy", response_model=List[Exercise])
async def copy_day(body: CopyDay, user: dict = Depends(require_user)):
    targets = sorted({d for d in body.to_days if 0 <= d <= 6 and d != body.from_day})
    if not targets:
        raise HTTPException(status_code=400, detail="Pick at least one other day")
    source = (
        await db.exercises.find(
            {"user_id": user["user_id"], "day": body.from_day}, {"_id": 0}
        )
        .sort("created_at", 1)
        .to_list(200)
    )
    if not source:
        raise HTTPException(status_code=400, detail="No exercises to copy")
    docs = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "day": d,
            "name": ex["name"],
            "sets": ex["sets"],
            "reps": ex["reps"],
            "photo_path": ex.get("photo_path"),
            "completed": False,
            "sets_done": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        for d in targets
        for ex in source
    ]
    await db.exercises.insert_many([dict(x) for x in docs])
    return [Exercise(**x) for x in docs]


@api_router.post("/exercises/reset")
async def reset_week(user: dict = Depends(require_user)):
    res = await db.exercises.update_many(
        {
            "user_id": user["user_id"],
            "$or": [{"completed": True}, {"sets_done": {"$gt": 0}}],
        },
        {"$set": {"completed": False, "sets_done": 0}},
    )
    return {"reset": res.modified_count}


# ---------- Photo routes ----------
@api_router.post("/photos")
async def upload_photo(
    file: UploadFile = File(...), user: dict = Depends(require_user)
):
    ctype = (file.content_type or "").lower()
    if ctype not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail="Please choose a JPG, PNG or WebP photo"
        )
    data = await file.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Photo is too large")
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4()}.{ALLOWED_TYPES[ctype]}"
    result = await run_in_threadpool(put_object, path, data, ctype)
    await db.photos.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "storage_path": result["path"],
            "content_type": ctype,
            "size": result.get("size", len(data)),
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"path": result["path"]}


@api_router.get("/photos/{path:path}")
async def get_photo(path: str, user: dict = Depends(require_user)):
    record = await db.photos.find_one(
        {"storage_path": path, "user_id": user["user_id"], "is_deleted": False}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    data, _ = await run_in_threadpool(get_object, path)
    return Response(
        content=data,
        media_type=record["content_type"],
        headers={"Cache-Control": "private, max-age=86400"},
    )


app.include_router(api_router)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    try:
        await run_in_threadpool(init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.get("/routes")
def routes():
    return [r.path for r in app.routes]


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
