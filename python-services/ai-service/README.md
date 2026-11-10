Summary service

This is the small Python part of ClientHub. Express sends it the project numbers, hours and recent comments, and it returns a short update. With a Groq key it asks the provider; without one it returns a template.

Install requirements.txt in a Python environment. If .env doesn't exist, copy .env.example and fill it in privately. From this folder, run:

python -m uvicorn main:app --host 127.0.0.1 --port 8000 --env-file .env

The env-file option matters because main.py only reads process variables. GET /health checks the service. POST /summary takes the project data. FastAPI also exposes /docs for trying the request shape.

The caller is server/src/services/aiSummaryService.js. This service has no database or authentication dependency yet, so I'd add service access control before treating a public endpoint as protected.

For tests, install pytest and pytest-asyncio separately, then run python -m pytest tests -q. The two checks cover health and fallback, not live Groq output.
