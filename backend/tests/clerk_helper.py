# Clerk Backend API helper for tests: creates TEST_ users, session tokens, sign-in tickets (never prints secret)
import os
import sys
import json
import uuid
import requests
from pathlib import Path
from dotenv import dotenv_values

_SK = dotenv_values(Path(__file__).resolve().parents[1] / ".env").get("CLERK_SECRET_KEY")
API = "https://api.clerk.com/v1"
H = {"Authorization": f"Bearer {_SK}", "User-Agent": "emergent-test-agent", "Content-Type": "application/json"}


def create_user(tag="a"):
    email = f"test_{tag}_{uuid.uuid4().hex[:8]}+clerk_test@example.com"
    r = requests.post(f"{API}/users", headers=H, json={
        "email_address": [email], "password": f"TEST_pw_{uuid.uuid4().hex}!", "first_name": "TEST_User",
        "skip_password_checks": True}, timeout=30)
    r.raise_for_status()
    return r.json()["id"], email


def session_token(user_id):
    r = requests.post(f"{API}/sessions", headers=H, json={"user_id": user_id}, timeout=30)
    r.raise_for_status()
    sid = r.json()["id"]
    t = requests.post(f"{API}/sessions/{sid}/tokens", headers=H, json={"expires_in_seconds": 3600}, timeout=30)
    t.raise_for_status()
    return t.json()["jwt"]


def sign_in_ticket(user_id):
    r = requests.post(f"{API}/sign_in_tokens", headers=H, json={"user_id": user_id, "expires_in_seconds": 3600}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def delete_user(user_id):
    requests.delete(f"{API}/users/{user_id}", headers=H, timeout=30)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "setup":
        uid, email = create_user("ui")
        print(json.dumps({"user_id": uid, "email": email, "ticket": sign_in_ticket(uid), "token": session_token(uid)}))
    elif cmd == "ticket":
        print(sign_in_ticket(sys.argv[2]))
    elif cmd == "delete":
        delete_user(sys.argv[2])
        print("deleted")
