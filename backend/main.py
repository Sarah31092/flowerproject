from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Include the project root when Uvicorn is launched from the backend folder.
PROJECT_DIR = Path(__file__).resolve().parent.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from backend.api.routes import router, store
from backend.mcp_server.server import mcp


BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="AI 꽃 정보 검색")

app.include_router(router)
app.mount("/mcp", mcp.streamable_http_app())
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/chat", response_class=HTMLResponse)
def flower_chat(request: Request):
    return templates.TemplateResponse(request=request, name="chat.html")


@app.get("/flowers", response_class=HTMLResponse)
def flower_types(request: Request):
    return templates.TemplateResponse(request=request, name="flower_types.html")


@app.get("/flower-stories", response_class=HTMLResponse)
def flower_stories(request: Request):
    return templates.TemplateResponse(request=request, name="flower_stories.html")


@app.get("/flowers/{name}", response_class=HTMLResponse)
def flower_page(request: Request, name: str):
    flower = store.get_by_name(name)
    if flower is None:
        raise HTTPException(status_code=404, detail="꽃 정보를 찾을 수 없습니다.")
    return templates.TemplateResponse(
        request=request,
        name="flower_detail.html",
        context={"flower": flower},
    )
