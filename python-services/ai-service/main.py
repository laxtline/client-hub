from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import os
import httpx
import json

app = FastAPI()

GROQ_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


class SummaryReq(BaseModel):
    project_title: str
    client_name: str | None = None
    completed_this_week: int
    total_tasks: int
    done_tasks: int
    hours_logged: float
    days_to_deadline: int | None
    recent_comments: list[str] = []


def build_prompt(req: SummaryReq) -> str:
    return f"""Project: "{req.project_title}" for {req.client_name or 'N/A'}.
Tasks: {req.completed_this_week} done this week, {req.done_tasks}/{req.total_tasks} total, {req.hours_logged}h logged.
Days to deadline: {req.days_to_deadline or 'none'}. Comments: {req.recent_comments[:3]}.
Return JSON: {{"summary": "3-4 sentence professional update", "riskFlag": "on_track|at_risk|delayed"}}"""


def fallback(req: SummaryReq) -> dict:
    deadline_part = f" Deadline in {req.days_to_deadline} day(s)." if req.days_to_deadline else ""
    return {
        "summary": f"{req.done_tasks}/{req.total_tasks} tasks completed ({req.completed_this_week} this week), {req.hours_logged} hours logged.{deadline_part} (AI unavailable)",
        "riskFlag": "unknown",
        "aiUsed": False,
    }


async def log_summary_request(req: SummaryReq, result: dict):
    print(f"[audit] summary requested: project={req.project_title}, ai_used={result.get('aiUsed')}")


@app.post("/summary")
async def summary(req: SummaryReq, background_tasks: BackgroundTasks):
    print(f"[ai-service] summary request for: {req.project_title}")
    if not GROQ_KEY:
        print("[ai-service] no GROQ_KEY, using fallback")
        result = fallback(req)
        background_tasks.add_task(log_summary_request, req, result)
        return result

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": build_prompt(req)}],
                    "max_tokens": 300,
                    "response_format": {"type": "json_object"},
                },
            )
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            result = {
                "summary": parsed.get("summary", "").strip(),
                "riskFlag": parsed.get("riskFlag", "unknown"),
                "aiUsed": True,
            }
            background_tasks.add_task(log_summary_request, req, result)
            print(f"[ai-service] got AI summary for: {req.project_title}")
            return result
    except Exception as e:
        print(f"[ai-service] groq error: {e}")
        result = fallback(req)
        background_tasks.add_task(log_summary_request, req, result)
        return result


@app.get("/health")
def health():
    return {"status": "ok", "groq": bool(GROQ_KEY)}
