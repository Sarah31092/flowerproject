from mcp.server.fastmcp import FastMCP

from backend.services.vector_store import FlowerStore


mcp = FastMCP("Flower Information MCP")
store = FlowerStore()


@mcp.tool()
def search_flowers(query: str, limit: int = 5) -> list[dict]:
    """상황이나 원하는 꽃의 의미에 맞는 꽃을 검색합니다."""
    return store.search(query, max(1, min(limit, 20)))


@mcp.tool()
def get_flower(name: str) -> dict:
    """꽃 이름으로 상세 정보를 조회합니다."""
    return store.get_by_name(name) or {"error": "꽃 정보를 찾을 수 없습니다."}


@mcp.tool()
def list_flowers(limit: int = 20) -> list[dict]:
    """등록된 꽃 목록을 조회합니다."""
    return store.list_flowers(max(1, min(limit, 100)))


if __name__ == "__main__":
    mcp.run(transport="stdio")
