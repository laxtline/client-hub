# quick tests for AI service
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_summary_fallback():
    """no groq key = fallback template"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/summary", json={
            "project_title": "Test Project",
            "client_name": "Test Client",
            "completed_this_week": 2,
            "total_tasks": 10,
            "done_tasks": 5,
            "hours_logged": 12.5,
            "days_to_deadline": 7,
            "recent_comments": ["good progress", "need review"]
        })
    assert r.status_code == 200
    data = r.json()
    assert "summary" in data
    assert data["riskFlag"] == "unknown"
    assert data["aiUsed"] is False
    assert "AI unavailable" in data["summary"]