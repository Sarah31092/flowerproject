import csv
import hashlib
import json
import re
from typing import Any

import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from backend.config import (
    CHROMA_DIR,
    COLLECTION_NAME,
    DATA_FILE,
    FLOWER_LANGUAGE_FILE,
    FLOWER_PHOTO_FILE,
    FLOWER_PROFILE_FILE,
)


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

    def list_flowers(self, limit: int | None = 20) -> list[dict[str, Any]]:
        flowers = self._load_flowers()
        return [
            {**flower, "description": flower.get("description") or self._describe(flower)}
            for flower in flowers[:None if limit is None else max(0, limit)]
        ]

    def get_by_name(self, name: str) -> dict[str, Any] | None:
        flower = next(
            (
                item for item in self._load_flowers()
                if name.casefold() in (item["name"].casefold(), item.get("english", "").casefold())
            ),
            None,
        )
        if flower is None:
            return None
        return {**flower, "description": flower.get("description") or self._describe(flower)}

    def search(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        if limit <= 0:
            return []

        flowers = self._load_flowers()
        normalized_query = " ".join(query.casefold().split())
        named_matches = []
        for flower in flowers:
            identifiers = {flower.get("name"), flower.get("english"), flower.get("korean_name"), flower.get("scientific_name")}
            positions = [
                match.start()
                for identifier in identifiers
                if isinstance(identifier, str) and identifier.strip()
                for term in [" ".join(identifier.casefold().split())]
                for match in re.finditer(
                    rf"(?<![a-z]){re.escape(term)}(?![a-z])", normalized_query
                )
            ]
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

        english_pattern = re.compile(rf"(?<!\w){re.escape(normalized_query)}(?!\w)")
        is_korean_query = bool(re.search(r"[가-힣]", normalized_query))
        reference_matches = [
            {**flower, "distance": 0.0}
            for flower in flowers
            if normalized_query and any(
                normalized_query in entry["meaning"] if is_korean_query else
                english_pattern.search(" ".join(entry.get("meaning_en", entry["meaning"]).casefold().split()))
                for entry in flower.get("reference_meanings", [])
            )
        ]
        collection_count = self.collection.count()
        if len(reference_matches) >= limit or collection_count == 0:
            return reference_matches[:limit]
        data = self.collection.query(
            query_texts=[query],
            n_results=collection_count,
            include=["documents", "metadatas", "distances"],
        )
        flowers_by_name = {
            flower["name"]: flower for flower in flowers
        }
        items = reference_matches
        matched_names = {flower["name"] for flower in items}
        for metadata, distance in zip(
            data["metadatas"][0],
            data["distances"][0],
        ):
            name = metadata.get("name")
            if not isinstance(name, str):
                continue
            flower = flowers_by_name.get(name)
            if flower is None or name in matched_names:
                continue
            item = {**flower, "description": flower.get("description") or self._describe(flower)}
            item["distance"] = round(float(distance), 4)
            items.append(item)
            if len(items) >= limit:
                break
        return items

    @staticmethod
    def _load_flowers() -> list[dict[str, Any]]:
        flowers = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        profiles = (
            json.loads(FLOWER_PROFILE_FILE.read_text(encoding="utf-8"))
            if FLOWER_PROFILE_FILE.is_file() else {}
        )
        for flower in flowers:
            for field, value in profiles.get(flower.get("english"), {}).items():
                flower.setdefault(field, value)
        if not FLOWER_LANGUAGE_FILE.is_file():
            return flowers

        photos = (
            json.loads(FLOWER_PHOTO_FILE.read_text(encoding="utf-8"))
            if FLOWER_PHOTO_FILE.is_file() else {}
        )
        by_english_name = {
            flower["english"].casefold(): flower for flower in flowers if flower.get("english")
        }
        with FLOWER_LANGUAGE_FILE.open(encoding="utf-8-sig", newline="") as source:
            for row in csv.DictReader(source):
                name = row["Flower"].strip()
                meaning = row["Meaning"].strip()
                color = row["Color"].strip()
                if not name or not meaning:
                    continue
                key = name.casefold()
                flower = by_english_name.get(key)
                if flower is None:
                    flower = {
                        "name": name, "english": name, "type": "", "language": meaning,
                        "meaning": "", "color": color, "origin": "", "season": "",
                        "reference_only": True,
                    }
                    if name in photos:
                        flower["photo"] = photos[name]
                    for field, value in profiles.get(name, {}).items():
                        flower.setdefault(field, value)
                    by_english_name[key] = flower
                    flowers.append(flower)
                entry = {"color": color, "meaning": meaning}
                if english_meaning := (row.get("Meaning_en") or "").strip():
                    entry["meaning_en"] = english_meaning
                meanings = flower.setdefault("reference_meanings", [])
                if entry not in meanings:
                    meanings.append(entry)
        return flowers

    @staticmethod
    def _describe(flower: dict[str, Any]) -> str:
        if flower.get("reference_only"):
            return flower["language"]
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
