from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.main import SlotInfo, _validate_booking_at, app

client = TestClient(app)
TECHS = [
    {"id": "a", "name": "Vannak Chea", "trade": "Plumber", "skills": "Pipe installation, leak detection", "provides": ["Pipe repair", "Faucet installation"], "services": ["Plumbing"], "areas": ["Tuol Kork"], "rating": 4.7, "jobs": 98},
    {"id": "b", "name": "Sok Dara", "trade": "Electrician", "skills": "Wiring, troubleshooting", "provides": ["Socket repair"], "services": ["Electrical"], "areas": ["Chamkar Mon"], "rating": 4.8, "jobs": 126},
    {"id": "c", "name": "Pisey Sok", "trade": "AC Technician", "skills": "AC maintenance", "provides": ["AC cleaning"], "services": ["Air Conditioning"], "areas": ["Daun Penh"], "rating": 4.9, "jobs": 211, "status": "busy"},
]


def rank(q):
    return [r["id"] for r in client.post("/rank", json={"query": q, "technicians": TECHS}).json()]


def test_synonym_and_typo():
    assert rank("leaking tap")[0] == "a"
    assert rank("plumbr")[0] == "a"  # typo
    assert rank("aircon") == ["c"]
    assert rank("zzzz") == []


def test_every_word_must_match():
    assert rank("plumber electrician") == []


def test_validate_booking():
    now = datetime(2026, 11, 24, 9, 30, tzinfo=ZoneInfo("Asia/Phnom_Penh")).isoformat()
    slot = {"id": "10-12", "start_hour": 10, "end_hour": 12}
    test_now = datetime.fromisoformat(now)
    test_slot = SlotInfo(**slot)
    validate = lambda day: _validate_booking_at(datetime.fromisoformat(day).date(), test_slot, test_now)
    assert validate("2026-11-23").ok is False
    assert validate("2026-11-24").ok is False  # 10:00 is only 30 min away
    assert validate("2026-11-25").ok is True
    assert validate("2027-03-01").ok is False


def test_validate_booking_rejects_client_supplied_now():
    response = client.post("/validate-booking", json={
        "date": "2026-11-25",
        "slot": {"id": "10-12", "start_hour": 10, "end_hour": 12},
        "now": "2030-01-01T09:30:00+00:00",
    })
    assert response.status_code == 422


def test_ics():
    body = {"id": "FN-ABC234\r\nATTENDEE:intruder", "technician": "Sok Dara", "service": "Socket repair\nReview", "date": "2026-12-01", "start_hour": 10, "end_hour": 12, "address": "#12, Street 51\r\nUnit 2", "district": "Daun Penh", "price": 10}
    text = client.post("/ics", json=body).text
    assert "DTSTART:20261201T030000Z" in text and "DTEND:20261201T050000Z" in text
    assert "UID:FN-ABC234\\nATTENDEE:intruder@fixnow" in text
    assert "SUMMARY:FixNow: Socket repair\\nReview with Sok Dara" in text
    assert "LOCATION:#12\\, Street 51\\nUnit 2\\, Daun Penh" in text
