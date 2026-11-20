import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.config import DATA_FILE
from backend.services.vector_store import FlowerStore


def document(flower: dict) -> str:
    return (
        f"{flower['name']}은(는) {flower['type']}이며 "
        f"꽃말은 {flower['language']}이고 의미는 {flower['meaning']}이다. "
        f"색상은 {flower['color']}, 원산지는 {flower['origin']}, "
        f"개화 시기는 {flower['season']}이다."
    )


def main() -> None:
    flowers = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    store = FlowerStore()

    old_ids = store.collection.get(include=[])["ids"]
    if old_ids:
        store.collection.delete(ids=old_ids)

    store.collection.upsert(
        ids=[f"flower-{i}" for i in range(len(flowers))],
        documents=[document(flower) for flower in flowers],
        metadatas=[{
            "name": flower["name"],
            "type": flower["type"],
            "language": flower["language"],
            "meaning": flower["meaning"],
            "color": flower["color"],
            "origin": flower["origin"],
            "season": flower["season"],
        } for flower in flowers],
    )
    print(f"{len(flowers)}개의 꽃 데이터를 ChromaDB에 저장했습니다.")


if __name__ == "__main__":
    main()
