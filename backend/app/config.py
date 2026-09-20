from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Client-Supplier Matchmaking API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/matchmaking_db"

    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["*"]

    # AI Matching Engine Configurations
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    MATCH_MIN_SCORE_THRESHOLD: float = 40.0  # Minimum 0-100 score threshold to save match

    # Matching Weights (Must sum to 1.0)
    MATCH_WEIGHT_SEMANTIC: float = 0.35
    MATCH_WEIGHT_CATEGORY: float = 0.20
    MATCH_WEIGHT_LOCATION: float = 0.15
    MATCH_WEIGHT_QUANTITY: float = 0.10
    MATCH_WEIGHT_BUDGET: float = 0.10
    MATCH_WEIGHT_DELIVERY: float = 0.10

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
