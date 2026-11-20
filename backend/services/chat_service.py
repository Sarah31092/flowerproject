import json

from openai import OpenAI

from backend.config import settings


class MissingOpenAIKeyError(Exception):
    pass


def create_flower_answer(
    message: str,
    history: list[dict[str, str]],
    flowers: list[dict],
) -> str:
    if settings.openai_api_key is None:
        raise MissingOpenAIKeyError

    flower_context = json.dumps(flowers, ensure_ascii=False)
    conversation = [
        {
            "role": "system",
            "content": (
                "당신은 Flower Garden의 친절한 꽃 추천 도우미입니다. "
                "반드시 한국어로 따뜻하고 간결하게 답하세요. "
                "아래 제공된 꽃 검색 자료를 등록된 꽃의 기준 정보로 사용해 "
                "꽃 이름, 종류, 꽃말, 의미, 색상, 원산지, 개화 시기, 특징과 관리법을 설명하세요. "
                "자료에 없는 사실은 추측하지 말고 확인할 수 없다고 말하세요. "
                "사용자가 특정 꽃을 물었고 자료에 그 꽃이 있으면 반드시 그 정보를 먼저 설명하고, "
                "자료에 있는 꽃을 등록되지 않았다고 말하지 마세요. "
                "자료가 비어 있으면 현재 등록된 꽃 정보에서 찾을 수 없다고 안내하세요.\n"
                f"꽃 검색 자료: {flower_context}"
            ),
        }
    ]
    conversation.extend(history)
    conversation.append({"role": "user", "content": message})

    client = OpenAI(api_key=settings.openai_api_key.get_secret_value())
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=conversation,
        max_tokens=500,
    )
    answer = response.choices[0].message.content
    if not answer or not answer.strip():
        raise RuntimeError("OpenAI returned an empty chat response")
    return answer.strip()
