import logging

from fastapi import APIRouter, HTTPException
from openai import OpenAIError
from pydantic import BaseModel, Field

from backend.services.chat_service import MissingOpenAIKeyError, create_flower_answer
from backend.services.vector_store import FlowerStore


router = APIRouter(prefix="/api")
store = FlowerStore()
logger = logging.getLogger(__name__)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=500)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    history: list[ChatMessage] = Field(default_factory=list, max_length=6)


@router.get("/flowers")
def list_flowers(limit: int = 20):
    return {"flowers": store.list_flowers(max(0, min(limit, 100)))}


@router.get("/flowers/{name}")
def flower_detail(name: str):
    flower = store.get_by_name(name)
    return {"detail": flower}


@router.post("/search")
def search(request: SearchRequest):
    return {
        "query": request.query,
        "results": store.search(request.query, request.limit),
    }


@router.post("/chat")
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        return {"answer": "전하고 싶은 마음을 조금 더 적어주세요.", "flowers": []}

    flowers = store.search(message, limit=3)
    history = [
        {"role": item.role, "content": item.content}
        for item in request.history[-6:]
    ]

    try:
        answer = create_flower_answer(message, history, flowers)
    except MissingOpenAIKeyError:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API 키가 설정되지 않았습니다. 프로젝트 루트의 .env 파일을 확인해 주세요.",
        ) from None
    except OpenAIError as error:
        logger.error("OpenAI chat request failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=502,
            detail="AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ) from None
    except RuntimeError as error:
        logger.error("OpenAI chat response failed (%s)", error)
        raise HTTPException(
            status_code=502,
            detail="AI가 응답을 생성하지 못했습니다. 다시 시도해 주세요.",
        ) from None

    return {"answer": answer, "flowers": flowers}
