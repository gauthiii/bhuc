"""Application settings for the BHUC backend, loaded from server/.env.

Modeled on the careatlas server config. This first cut focuses on AWS Cognito
(email/password + TOTP MFA). ServiceNow A2A / Table-API settings are included as
optional fields so the same .env can be extended later (BE workstream) without a
config change.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_DIR = Path(__file__).resolve().parents[1]

# Load .env into the process environment so boto3 picks up AWS_ACCESS_KEY_ID /
# AWS_SECRET_ACCESS_KEY / AWS_REGION from the standard AWS credential chain.
load_dotenv(SERVER_DIR / ".env")


class Settings(BaseSettings):
    # ---- AWS Cognito (email/password + TOTP MFA) ----
    cognito_region: str = "us-east-1"
    cognito_user_pool_id: Optional[str] = None
    cognito_client_id: Optional[str] = None
    cognito_client_secret: Optional[str] = None

    # ---- CORS ----
    # Comma-separated list of browser origins allowed to call this API.
    cors_origins: str = "http://localhost:5173"

    # ---- ServiceNow (optional now; used by the A2A/CRUD layer later) ----
    snow_instance: Optional[str] = None
    snow_username: Optional[str] = None
    snow_password: Optional[str] = None
    snow_a2a_client_id: Optional[str] = None
    snow_a2a_client_secret: Optional[str] = None
    snow_a2a_scope: Optional[str] = "a2aauthscope"
    snow_a2a_token_skew_seconds: int = 60
    # A2A agent execution timeout (blocking mode; agent can take a while, BE-Step 5).
    snow_agent_execute_timeout: float = 90.0

    # ---- BHUC agent sys_id map (sn_aia_agent) — captured live (action.md AG-11) ----
    # Agent 1: BHUC Front Door Security Agent (svc-bhuc-frontdoor). [Verified over A2A 2026-07-07]
    snow_agent_frontdoor: str = "903ca5a73b390f1076f13b64c3e45a90"
    # Agent 2: BHUC Risk Identification Agent. [Verified over A2A 2026-07-07]
    snow_agent_risk: str = "ac2e79a73b7d0f1076f13b64c3e45af3"
    # Agent 3: BHUC Clinical Documentation Agent. [Verified over A2A 2026-07-07]
    snow_agent_clinicaldoc: str = "59243d673bf5cb105551369693e45aed"

    request_timeout: float = 20.0

    model_config = SettingsConfigDict(
        env_file=SERVER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def snow_base_url(self) -> Optional[str]:
        return f"https://{self.snow_instance}" if self.snow_instance else None


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
