from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent
CHROMA_DIR = ROOT_DIR / "chroma_db"
DATA_FILE = ROOT_DIR / "data" / "flowers.json"
COLLECTION_NAME = "flowers"


class Settings(BaseSettings):
    openai_api_key: SecretStr | None = None

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
