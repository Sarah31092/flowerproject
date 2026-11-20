import hashlib
import json
from typing import Any

import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from backend.config import CHROMA_DIR, COLLECTION_NAME, DATA_FILE


class SimpleEmbedding(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        result = []
        for text in input:
            vector = [0.0] * 384
            for word in str(text).lower().split():
                digest = hashlib.sha256(word.encode("utf-8")).digest()
                for i in range(32):
                    position = ((digest[i] * 13) + i * 7) % 384
                    vector[position] += 1.0 if digest[i] % 2 else -1.0
            length = sum(value * value for value in vector) ** 0.5 or 1.0
            result.append([value / length for value in vector])
        return result


class FlowerStore:
    def __init__(self) -> None:
        self.client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=SimpleEmbedding(),
        )

    def list_flowers(self, limit: int = 20) -> list[dict[str, Any]]:
        flowers = self._load_flowers()
        return [
            {**flower, "description": flower.get("description") or self._describe(flower)}
            for flower in flowers[:max(0, limit)]
        ]

    def get_by_name(self, name: str) -> dict[str, Any] | None:
        flower = next(
            (item for item in self._load_flowers() if item["name"] == name),
            None,
        )
        if flower is None:
            return None
        return {**flower, "description": flower.get("description") or self._describe(flower)}

    def search(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        if limit <= 0:
            return []

        flowers = self._load_flowers()
        normalized_query = "".join(query.casefold().split())
        named_matches = []
        for flower in flowers:
            identifiers = (flower.get("name"), flower.get("english"))
            positions = [
                normalized_query.find("".join(identifier.casefold().split()))
                for identifier in identifiers
                if isinstance(identifier, str) and identifier.strip()
            ]
            positions = [position for position in positions if position >= 0]
            if positions:
                named_matches.append((min(positions), flower))

        if named_matches:
            named_matches.sort(key=lambda match: match[0])
            return [
                {
                    **flower,
                    "description": flower.get("description") or self._describe(flower),
                    "distance": 0.0,
                }
                for _, flower in named_matches[:limit]
            ]

        collection_count = self.collection.count()
        if collection_count == 0:
            return []
        data = self.collection.query(
            query_texts=[query],
            n_results=collection_count,
            include=["documents", "metadatas", "distances"],
        )
        flowers_by_name = {
            flower["name"]: flower for flower in flowers
        }
        items = []
        for metadata, distance in zip(
            data["metadatas"][0],
            data["distances"][0],
        ):
            name = metadata.get("name")
            if not isinstance(name, str):
                continue
            flower = flowers_by_name.get(name)
            if flower is None:
                continue
            item = {**flower, "description": flower.get("description") or self._describe(flower)}
            item["distance"] = round(float(distance), 4)
            items.append(item)
            if len(items) >= limit:
                break
        return items

    @staticmethod
    def _load_flowers() -> list[dict[str, Any]]:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))

    @staticmethod
    def _describe(flower: dict[str, Any]) -> str:
        return (
            f"{flower['name']}은(는) {flower['type']}이며 "
            f"꽃말은 {flower['language']}이고 의미는 {flower['meaning']}이다. "
            f"색상은 {flower['color']}, 원산지는 {flower['origin']}, "
            f"개화 시기는 {flower['season']}이다."
        )

    @staticmethod
    def _format(data: dict[str, Any]) -> list[dict[str, Any]]:
        items = []
        for metadata, document in zip(data["metadatas"], data["documents"]):
            item = dict(metadata)
            item["description"] = document
            items.append(item)
        return items
