from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import database
import ai
import consistency

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    database.init_db()

class EventBrief(BaseModel):
    event_name: str
    event_type: str
    date: str
    time: str
    venue: str
    target_audience: str
    theme: str
    objectives: str
    registration_link: str
    speakers: Optional[str] = ""
    activities: Optional[str] = ""
    important_instructions: Optional[str] = ""

class GenerateRequest(BaseModel):
    event_brief: EventBrief

class ConsistencyRequest(BaseModel):
    event_brief: EventBrief
    generated_package: Any

class SaveEventRequest(BaseModel):
    event_brief: EventBrief
    generated_package: Any
    poster_reference: Optional[str] = None

@app.post("/api/events/generate")
def generate_event(req: GenerateRequest):
    try:
        package = ai.generate_event_package(req.event_brief.model_dump())
        return {"package": package}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An internal error occurred during generation.")

@app.post("/api/events/check-consistency")
def check_consistency_endpoint(req: ConsistencyRequest):
    try:
        result = consistency.check_consistency(req.event_brief.model_dump(), req.generated_package)
        return result
    except Exception as e:
        return {"status": "error", "mismatches": [], "message": str(e)}

@app.post("/api/events/generate-poster")
def generate_poster_endpoint(req: GenerateRequest):
    try:
        poster = ai.generate_poster(req.event_brief.model_dump())
        if poster:
            return {"poster": poster}
        else:
            return {"poster": None, "message": "Poster generation unavailable"}
    except Exception as e:
        return {"poster": None, "message": str(e)}

@app.post("/api/events")
def save_event(req: SaveEventRequest):
    try:
        event = database.create_event(req.event_brief.model_dump(), req.generated_package, req.poster_reference)
        return event
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save event.")

@app.get("/api/events")
def get_events():
    try:
        return database.get_events()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch events.")

@app.get("/api/events/{event_id}")
def get_event(event_id: int):
    event = database.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@app.put("/api/events/{event_id}")
def update_event_endpoint(event_id: int, req: SaveEventRequest):
    try:
        event = database.update_event(event_id, req.event_brief.model_dump(), req.generated_package, req.poster_reference)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return event
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update event.")

@app.delete("/api/events/{event_id}")
def delete_event_endpoint(event_id: int):
    try:
        database.delete_event(event_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete event.")
