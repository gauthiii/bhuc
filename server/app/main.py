"""FastAPI entrypoint for the BHUC backend.

For now this hosts the AWS Cognito auth router (mirrors careatlas). The ServiceNow
A2A / Table-API layer (BE workstream) will be added as additional routers behind
the same /api surface. Run locally with:

    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .aws_auth import router as aws_auth_router
from .frontdoor import router as frontdoor_router
from .risk import router as risk_router
from .note import router as note_router
from .patient import router as patient_router

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="BHUC API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict:
        return {
            "status": "ok",
            "service": "bhuc-api",
            "cognito_configured": bool(
                settings.cognito_user_pool_id and settings.cognito_client_id and settings.cognito_client_secret
            ),
        }

    app.include_router(aws_auth_router)
    app.include_router(frontdoor_router)
    app.include_router(risk_router)
    app.include_router(note_router)
    app.include_router(patient_router)
    return app


app = create_app()
