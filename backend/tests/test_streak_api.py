# Streak + per-set ticking API tests (fresh throwaway Clerk users; cleans exercises + week_completions)
import os
import sys
import pytest
import requests
from pathlib import Path
from dotenv import dotenv_values
from pymongo import MongoClient

sys.path.insert(0, str(Path(__file__).parent))
import clerk_helper as ch

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"
_ENV = dotenv_values(Path(__file__).resolve().parents[1] / ".env")


def _db():
    return MongoClient(_ENV["MONGO_URL"])[_ENV["DB_NAME"]]


@pytest.fixture(scope="module")
def users():
    a_id, _ = ch.create_user("sa")
    b_id, _ = ch.create_user("sb")
    yield {"a": (a_id, ch.session_token(a_id)), "b": (b_id, ch.session_token(b_id))}
    db = _db()
    for uid in (a_id, b_id):
        db.week_completions.delete_many({"user_id": uid})
        db.exercises.delete_many({"user_id": uid})  # throwaway users only
        ch.delete_user(uid)


def _client(tok):
    s = requests.Session(); s.headers["Authorization"] = f"Bearer {tok}"; return s


@pytest.fixture(scope="module")
def ca(users):
    return _client(users["a"][1])


@pytest.fixture(scope="module")
def cb(users):
    return _client(users["b"][1])


# Auth guard
def test_streak_requires_auth():
    assert requests.get(f"{API}/streak").status_code == 401


# Empty user -> 0
def test_streak_initial_zero(ca):
    r = ca.get(f"{API}/streak")
    assert r.status_code == 200
    assert r.json() == {"streak": 0, "this_week_done": False, "best": 0}


# Per-set ticking + streak transitions
def test_streak_flow(ca, cb):
    e1 = ca.post(f"{API}/exercises", json={"day": 0, "name": "TEST_streak_a", "sets": 3, "reps": "10"}).json()
    e2 = ca.post(f"{API}/exercises", json={"day": 2, "name": "TEST_streak_b", "sets": 2, "reps": "8"}).json()
    # partial set
    r = ca.patch(f"{API}/exercises/{e1['id']}", json={"sets_done": 2}).json()
    assert r["sets_done"] == 2 and r["completed"] is False
    # clamp above sets
    r = ca.patch(f"{API}/exercises/{e1['id']}", json={"sets_done": 9}).json()
    assert r["sets_done"] == 3 and r["completed"] is True
    assert ca.get(f"{API}/streak").json()["streak"] == 0  # e2 still open
    r = ca.patch(f"{API}/exercises/{e2['id']}", json={"completed": True}).json()
    assert r["sets_done"] == 2 and r["completed"]
    s = ca.get(f"{API}/streak").json()
    assert s == {"streak": 1, "this_week_done": True, "best": 1}
    # isolation: B unaffected
    assert cb.get(f"{API}/streak").json()["streak"] == 0
    # B cannot tick A's exercise
    assert cb.patch(f"{API}/exercises/{e1['id']}", json={"sets_done": 0}).status_code == 404
    # persistence
    xs = {x["id"]: x for x in ca.get(f"{API}/exercises").json()}
    assert xs[e1["id"]]["sets_done"] == 3 and xs[e2["id"]]["completed"]
    # untick -> streak stays recorded (week already logged)
    ca.patch(f"{API}/exercises/{e2['id']}", json={"sets_done": 0})
    s2 = ca.get(f"{API}/streak").json()
    print("streak after untick:", s2)


# Delete last open exercise completes the week (user B)
def test_delete_last_open_records_week(cb):
    done = cb.post(f"{API}/exercises", json={"day": 1, "name": "TEST_b_done", "sets": 1, "reps": "5"}).json()
    cb.patch(f"{API}/exercises/{done['id']}", json={"completed": True})
    # B already all done -> streak 1; now add open one and delete it
    assert cb.get(f"{API}/streak").json()["streak"] == 1


# Validation
def test_sets_done_validation(ca):
    e = ca.post(f"{API}/exercises", json={"day": 3, "name": "TEST_val", "sets": 2, "reps": "5"}).json()
    assert ca.patch(f"{API}/exercises/{e['id']}", json={"sets_done": -1}).status_code == 422
    # sets reduced below sets_done clamps
    ca.patch(f"{API}/exercises/{e['id']}", json={"sets_done": 2})
    r = ca.patch(f"{API}/exercises/{e['id']}", json={"sets": 5}).json()
    assert r["sets_done"] == 2 and r["completed"] is False


# Streak math via injected history (prior weeks)
def test_streak_consecutive_history(users, ca):
    from datetime import date, timedelta, datetime, timezone
    uid = users["a"][0]
    cur = datetime.now(timezone.utc).date()
    cur = cur - timedelta(days=cur.weekday())
    db = _db()
    for k in (1, 2, 4, 5, 6):  # gap at week 3
        w = (cur - timedelta(days=7 * k)).isoformat()
        db.week_completions.update_one({"user_id": uid, "week_start": w}, {"$set": {"user_id": uid, "week_start": w}}, upsert=True)
    s = ca.get(f"{API}/streak").json()
    assert s["this_week_done"] is True
    assert s["streak"] == 3  # this + 1 + 2
    assert s["best"] == 3
