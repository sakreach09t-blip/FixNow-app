"""FixNow Python service.

Called by the Node API (never by the browser). It owns three pieces of logic:
  POST /rank              smart technician search (typo-tolerant, synonym-aware scoring)
  POST /validate-booking  business rules for a requested date and time slot
  POST /ics               builds an iCalendar file for a booking
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="FixNow Python service", version="1.0.0")

TZ = ZoneInfo("Asia/Phnom_Penh")
BOOKING_WINDOW_DAYS = 60
MIN_LEAD_MINUTES = 60

# Words people type that should find the right trade even if the profile never uses them.
SYNONYMS = {
    "aircon": ["ac", "air conditioning", "cooling"],
    "aircond": ["ac", "air conditioning", "cooling"],
    "ac": ["air conditioning", "cooling"],
    "air": ["air conditioning"],
    "cool": ["cooling", "ac"],
    "leak": ["plumber", "plumbing", "pipe", "waterproofing"],
    "leaking": ["plumber", "plumbing", "pipe", "waterproofing"],
    "tap": ["plumber", "faucet", "plumbing"],
    "faucet": ["plumber", "tap"],
    "drain": ["plumber", "plumbing"],
    "toilet": ["plumber", "plumbing"],
    "pipe": ["plumber", "plumbing"],
    "water": ["plumber", "plumbing"],
    "light": ["electrician", "electrical", "lighting"],
    "lights": ["electrician", "electrical", "lighting"],
    "lamp": ["electrician", "electrical", "lighting"],
    "wiring": ["electrician", "electrical"],
    "wire": ["electrician", "electrical"],
    "socket": ["electrician", "electrical"],
    "power": ["electrician", "electrical", "breaker"],
    "fuse": ["electrician", "breaker"],
    "electric": ["electrician", "electrical"],
    "wood": ["carpenter", "carpentry", "woodwork"],
    "door": ["carpenter", "carpentry", "door"],
    "cabinet": ["carpenter", "carpentry"],
    "furniture": ["carpenter", "carpentry", "handyman"],
    "shelf": ["carpenter", "shelving", "handyman"],
    "wardrobe": ["carpenter", "carpentry"],
    "paint": ["painter", "painting"],
    "wall": ["painter", "painting", "handyman"],
    "fridge": ["appliance", "refrigerator"],
    "refrigerator": ["appliance", "fridge"],
    "washer": ["appliance", "washing machine"],
    "washing": ["appliance", "washing machine"],
    "roof": ["waterproofing", "roofing"],
    "waterproof": ["waterproofing"],
    "damp": ["waterproofing"],
    "fix": ["handyman", "repair"],
    "repair": ["handyman", "repair"],
}

FIELD_WEIGHTS = {"name": 5.0, "trade": 4.0, "services": 3.0, "provides": 3.0, "skills": 2.0, "areas": 1.0}


class RankTechnician(BaseModel):
    id: str
    name: str
    trade: str
    skills: str = ""
    provides: list[str] = []
    services: list[str] = []
    areas: list[str] = []
    rating: float = 0
    jobs: int = 0
    status: str = "available"


class RankRequest(BaseModel):
    query: str
    technicians: list[RankTechnician]


class Ranked(BaseModel):
    id: str
    score: float


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def token_match(token: str, words: list[str]) -> float:
    """1.0 for an exact or prefix hit, up to ~0.8 for a close typo, 0 otherwise."""
    best = 0.0
    for word in words:
        if word == token:
            return 1.0
        if len(token) >= 3 and (word.startswith(token) or token.startswith(word) and len(word) >= 4):
            best = max(best, 0.9)
        elif len(token) >= 4:
            ratio = SequenceMatcher(None, token, word).ratio()
            if ratio >= 0.8:
                best = max(best, ratio * 0.85)
    return best


def score_technician(tokens: list[str], tech: RankTechnician) -> float:
    fields = {
        "name": tokenize(tech.name),
        "trade": tokenize(tech.trade),
        "services": tokenize(" ".join(tech.services)),
        "provides": tokenize(" ".join(tech.provides)),
        "skills": tokenize(tech.skills),
        "areas": tokenize(" ".join(tech.areas)),
    }
    total = 0.0
    for token in tokens:
        candidates = [token] + [w for phrase in SYNONYMS.get(token, []) for w in tokenize(phrase)]
        token_best = 0.0
        for index, candidate in enumerate(candidates):
            penalty = 1.0 if index == 0 else 0.7  # synonyms count a little less than literal hits
            for field, words in fields.items():
                token_best = max(token_best, token_match(candidate, words) * FIELD_WEIGHTS[field] * penalty)
        if token_best == 0:
            return 0.0  # every typed word must match something, same rule as the old on-page search
        total += token_best
    # Gentle quality signals break ties between equally relevant technicians.
    total += tech.rating * 0.1 + min(tech.jobs, 200) / 2000
    if tech.status == "available":
        total += 0.25
    return round(total, 4)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "fixnow-python"}


@app.post("/rank", response_model=list[Ranked])
def rank(request: RankRequest) -> list[Ranked]:
    tokens = tokenize(request.query)
    if not tokens:
        return [Ranked(id=t.id, score=0) for t in request.technicians]
    scored = [Ranked(id=t.id, score=score_technician(tokens, t)) for t in request.technicians]
    return sorted((s for s in scored if s.score > 0), key=lambda s: s.score, reverse=True)


# ------------------------------------------------------------------ booking rules
class SlotInfo(BaseModel):
    id: str
    start_hour: int
    end_hour: int


class ValidateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    slot: SlotInfo


class ValidateResponse(BaseModel):
    ok: bool
    reason: Optional[str] = None


@app.post("/validate-booking", response_model=ValidateResponse)
def validate_booking(request: ValidateRequest) -> ValidateResponse:
    return _validate_booking_at(request.date, request.slot, datetime.now(TZ))


def _validate_booking_at(request_date: date, slot: SlotInfo, now: datetime) -> ValidateResponse:
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("now must include a timezone.")
    now = now.astimezone(TZ)
    today = now.date()
    if request_date < today:
        return ValidateResponse(ok=False, reason="That date has already passed.")
    if request_date > today + timedelta(days=BOOKING_WINDOW_DAYS):
        return ValidateResponse(ok=False, reason=f"Please choose a date within the next {BOOKING_WINDOW_DAYS} days.")
    start = datetime(request_date.year, request_date.month, request_date.day, slot.start_hour, tzinfo=TZ)
    if start < now + timedelta(minutes=MIN_LEAD_MINUTES):
        return ValidateResponse(ok=False, reason="That time is too soon. Please choose a slot at least an hour from now.")
    return ValidateResponse(ok=True)


# ------------------------------------------------------------------ iCalendar
class IcsRequest(BaseModel):
    id: str
    technician: str
    service: str
    date: date
    start_hour: int
    end_hour: int
    address: str
    district: str
    price: int = Field(ge=0)


def _escape(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    for char, replacement in (("\\", "\\\\"), (";", "\\;"), (",", "\\,"), ("\n", "\\n")):
        value = value.replace(char, replacement)
    return value


def _utc_ics_time(day: date, hour: int) -> str:
    local_time = datetime(day.year, day.month, day.day, hour, tzinfo=TZ)
    return local_time.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")


@app.post("/ics", response_class=PlainTextResponse)
def ics(request: IcsRequest) -> PlainTextResponse:
    stamp = datetime.now(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FixNow//Booking//EN", "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:{_escape(request.id)}@fixnow",
        f"DTSTAMP:{stamp}",
        f"DTSTART:{_utc_ics_time(request.date, request.start_hour)}",
        f"DTEND:{_utc_ics_time(request.date, request.end_hour)}",
        f"SUMMARY:{_escape(f'FixNow: {request.service} with {request.technician}')}",
        f"LOCATION:{_escape(f'{request.address}, {request.district}')}",
        f"DESCRIPTION:{_escape(f'Booking reference {request.id}. Starting price ${request.price}, confirmed on site.')}",
        "END:VEVENT", "END:VCALENDAR",
    ]
    return PlainTextResponse("\r\n".join(lines) + "\r\n", media_type="text/calendar")
