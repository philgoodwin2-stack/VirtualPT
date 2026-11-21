# Weekly Reps API tests: auth guard, exercises CRUD/reset, photos, cross-user isolation
import io
import os
import struct
import zlib
import pytest
import requests
from pathlib import Path
from dotenv import dotenv_values

import sys
sys.path.insert(0, str(Path(__file__).parent))
import clerk_helper as ch

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"


def tiny_png():
    raw = b"\x00\xff\x00\x00"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


@pytest.fixture(scope="module")
def users():
    a_id, _ = ch.create_user("a")
    b_id, _ = ch.create_user("b")
    yield {"a": (a_id, ch.session_token(a_id)), "b": (b_id, ch.session_token(b_id))}
    ch.delete_user(a_id)
    ch.delete_user(b_id)


@pytest.fixture(scope="module")
def ca(users):
    s = requests.Session(); s.headers["Authorization"] = f"Bearer {users['a'][1]}"; return s


@pytest.fixture(scope="module")
def cb(users):
    s = requests.Session(); s.headers["Authorization"] = f"Bearer {users['b'][1]}"; return s


@pytest.fixture(scope="module")
def created(ca):
    ids = []
    yield ids
    for i in ids:
        ca.delete(f"{API}/exercises/{i}")


# Auth guard
@pytest.mark.parametrize("method,path", [("get", "/exercises"), ("post", "/exercises"), ("patch", "/exercises/x"),
                                         ("delete", "/exercises/x"), ("post", "/exercises/reset"), ("post", "/photos"),
                                         ("get", "/photos/weekly-reps/uploads/x/y.jpg")])
def test_unauth_401(method, path):
    r = getattr(requests, method)(f"{API}{path}", json={} if method in ("post", "patch") else None)
    assert r.status_code == 401, r.text


def test_bad_token_401():
    r = requests.get(f"{API}/exercises", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


# Exercise CRUD
def test_create_list_update_reset_delete(ca, created):
    r = ca.post(f"{API}/exercises", json={"day": 2, "name": "  TEST_Squat ", "sets": 3, "reps": "8-12"})
    assert r.status_code == 200, r.text
    ex = r.json(); created.append(ex["id"])
    assert ex["name"] == "TEST_Squat" and ex["sets"] == 3 and ex["reps"] == "8-12" and ex["completed"] is False
    assert "_id" not in ex and "user_id" not in ex
    lst = ca.get(f"{API}/exercises").json()
    assert any(e["id"] == ex["id"] for e in lst)
    r = ca.patch(f"{API}/exercises/{ex['id']}", json={"completed": True, "day": 4, "name": "TEST_Squat2"})
    assert r.status_code == 200 and r.json()["completed"] is True and r.json()["day"] == 4
    got = [e for e in ca.get(f"{API}/exercises").json() if e["id"] == ex["id"]][0]
    assert got["completed"] is True and got["name"] == "TEST_Squat2"
    r = ca.post(f"{API}/exercises/reset")
    assert r.status_code == 200 and r.json()["reset"] >= 1
    got = [e for e in ca.get(f"{API}/exercises").json() if e["id"] == ex["id"]][0]
    assert got["completed"] is False and got["name"] == "TEST_Squat2"
    assert ca.delete(f"{API}/exercises/{ex['id']}").status_code == 200
    created.remove(ex["id"])
    assert ca.delete(f"{API}/exercises/{ex['id']}").status_code == 404
    assert not any(e["id"] == ex["id"] for e in ca.get(f"{API}/exercises").json())


@pytest.mark.parametrize("body", [{"day": 7, "name": "TEST_x", "sets": 3, "reps": "10"},
                                  {"day": 0, "name": "", "sets": 3, "reps": "10"},
                                  {"day": 0, "name": "TEST_x", "sets": 0, "reps": "10"},
                                  {"day": 0, "name": "TEST_x", "sets": 3, "reps": ""},
                                  {"day": 0, "name": "x" * 61, "sets": 3, "reps": "10"}])
def test_create_validation_422(ca, body):
    assert ca.post(f"{API}/exercises", json=body).status_code == 422


def test_whitespace_name(ca, created):
    r = ca.post(f"{API}/exercises", json={"day": 0, "name": "   ", "sets": 3, "reps": "10"})
    if r.status_code == 200:
        created.append(r.json()["id"])
    assert r.status_code in (400, 422), f"whitespace-only name accepted: {r.json()}"


def test_patch_empty_400(ca, created):
    ex = ca.post(f"{API}/exercises", json={"day": 1, "name": "TEST_e", "sets": 1, "reps": "5"}).json(); created.append(ex["id"])
    assert ca.patch(f"{API}/exercises/{ex['id']}", json={}).status_code == 400


# Photos + isolation
def test_photo_and_isolation(ca, cb, created):
    r = ca.post(f"{API}/photos", files={"file": ("p.png", tiny_png(), "image/png")})
    assert r.status_code == 200, r.text
    path = r.json()["path"]
    g = ca.get(f"{API}/photos/{path}")
    assert g.status_code == 200 and g.headers["content-type"].startswith("image/png") and g.content[:4] == b"\x89PNG"
    assert cb.get(f"{API}/photos/{path}").status_code == 404
    ex = ca.post(f"{API}/exercises", json={"day": 3, "name": "TEST_Photo", "sets": 2, "reps": "10", "photo_path": path}).json()
    created.append(ex["id"])
    assert ex["photo_path"] == path
    # B cannot attach A's photo
    assert cb.post(f"{API}/exercises", json={"day": 3, "name": "TEST_steal", "sets": 2, "reps": "10", "photo_path": path}).status_code == 400
    # B cannot see/edit/delete A's exercise
    assert not any(e["id"] == ex["id"] for e in cb.get(f"{API}/exercises").json())
    assert cb.patch(f"{API}/exercises/{ex['id']}", json={"completed": True}).status_code == 404
    assert cb.delete(f"{API}/exercises/{ex['id']}").status_code == 404
    # B reset doesn't affect A
    ca.patch(f"{API}/exercises/{ex['id']}", json={"completed": True})
    cb.post(f"{API}/exercises/reset")
    got = [e for e in ca.get(f"{API}/exercises").json() if e["id"] == ex["id"]][0]
    assert got["completed"] is True
    # remove photo
    r = ca.patch(f"{API}/exercises/{ex['id']}", json={"remove_photo": True})
    assert r.status_code == 200 and r.json()["photo_path"] is None


def test_photo_bad_type(ca):
    r = ca.post(f"{API}/photos", files={"file": ("a.txt", b"hello", "text/plain")})
    assert r.status_code == 400
