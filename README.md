# Flower Garden · AI 꽃 정보 검색

FastAPI와 HTML/CSS/JavaScript로 만든 꽃 도감 및 질의응답 웹 애플리케이션입니다. 로컬 JSON과 CSV에서 꽃 이름과 꽃말을 검색하고, 국립원예특작과학원 **오늘의 꽃** API가 제공하는 꽃 목록과 상세 정보를 조회합니다. 꽃 챗봇은 로컬 도감의 검색 결과를 바탕으로 한국어로 답변합니다.

## 주요 기능

- 한글 이름, 영명, 학명, 꽃말로 로컬 도감 검색
- **꽃의 종류** 화면에서 분류별 꽃 목록과 국립원예특작과학원 **공공데이터** 필터 제공
- 상세창에서 사진, 꽃말, 학명, 이용, 기르기, 자생지 중 자료가 있는 항목 표시
- 도감과 공공데이터에서 중복으로 확인된 꽃은 한 카드로 표시하고, 연결된 참조 사진과 공공 API 상세 정보 사용
- 장미·수국·해바라기·카네이션은 기존 도감과 공공 API의 꽃말을 한 칸에 표시
- 한국어 꽃말과 영문 원문으로 CSV 꽃말 검색
- ChromaDB 유사 검색 및 검색 자료를 활용한 OpenAI 질의응답
- MCP 표준 입출력(stdio) 도구를 통한 꽃 목록, 상세 정보, 검색 제공

홈 검색과 챗봇의 검색 근거는 로컬 도감에서 가져옵니다. 국립원예특작과학원 전체 목록과 상세 정보는 **꽃의 종류 → 공공데이터**에서 조회합니다. 공공 API를 사용할 수 없는 경우 로컬 도감은 계속 이용할 수 있습니다.

## 기술과 구성

- Python 3.12, FastAPI, Uvicorn, Jinja2
- ChromaDB와 로컬 해시 기반 384차원 임베딩
- OpenAI API, 국립원예특작과학원 오늘의 꽃 OpenAPI, Pydantic Settings
- MCP Python SDK
- HTML, CSS, JavaScript

```text
backend/
  main.py                  FastAPI 화면·라우터 및 MCP HTTP 마운트
  config.py                .env 설정과 데이터 경로
  api/routes.py            꽃 목록·상세·검색·챗봇 API
  services/
    vector_store.py        JSON·CSV 통합 조회와 ChromaDB 검색
    today_flower.py        국립원예특작과학원 API 조회 및 XML 처리
    chat_service.py        검색 자료를 사용하는 OpenAI 질의응답
  mcp_server/server.py     MCP 도구 정의 및 stdio 실행 진입점
  templates/               홈, 꽃의 종류, 꽃 챗봇 화면
  static/                  CSS, JavaScript, 꽃 이미지
scripts/
  ingest_flowers.py        기본 도감의 ChromaDB 임베딩 생성
data/
  flowers.json             기본 꽃 도감
  language-of-flowers.csv  한국어 꽃말과 영문 원문
  flower-profiles.json     학명, 설명, 재배 정보, 공공데이터 연결
  flower-photos.json       참조 이미지 경로, 출처, 라이선스
chroma_db/                 ChromaDB 영구 저장소
.env.example               API 키 설정 예시
requirements.txt           Python 의존성
run.bat                    Windows 웹 서버 실행
```

## 설치

Windows PowerShell에서 프로젝트 루트로 이동해 기존 가상환경에 필요한 패키지를 설치합니다.

```powershell
cd C:\fastapiworkspace\flowerproject
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

프로젝트 루트의 `.env`에서 사용할 기능의 키를 설정합니다. 키 값은 소스 코드와 Git에 넣지 않습니다.

| 설정 | 필요한 기능 |
| --- | --- |
| `OPENAI_API_KEY` | 꽃 챗봇 답변 생성 |
| `FLOWER_API_KEY` | 국립원예특작과학원 꽃 목록, 상세 정보, 오늘의 꽃 조회 |

키 없이도 로컬 도감의 목록, 상세창, 검색을 이용할 수 있습니다. 설정하지 않은 키가 필요한 API를 호출하면 서버가 안내 메시지와 함께 HTTP 503을 반환합니다.

## 데이터 준비와 적재

로컬 도감은 `data/flowers.json`과 `data/language-of-flowers.csv`를 읽고, `flower-profiles.json`의 보충 자료와 `flower-photos.json`의 참조 사진 정보를 결합합니다. CSV의 `Meaning` 열에는 한국어 꽃말이, `Meaning_en` 열에는 영문 원문이 들어 있습니다.

별도의 도감 DB 적재 명령 없이 웹에서 목록과 상세 정보를 조회할 수 있습니다. 참조 사진은 `backend/static/flowers/reference/`에 있으며, 공공 꽃 목록과 상세 정보는 서버가 국립원예특작과학원 API에서 가져옵니다.

## 임베딩 생성

유사 검색 인덱스를 새로 만들거나 `flowers.json`의 변경 사항을 반영하려면 프로젝트 루트에서 실행합니다.

```powershell
cd C:\fastapiworkspace\flowerproject
.\.venv\Scripts\python.exe scripts\ingest_flowers.py
```

이 명령은 ChromaDB의 `flowers` 컬렉션에 있는 기존 항목을 `flowers.json`에서 생성한 항목으로 교체합니다. 임베딩은 로컬에서 생성하며, 꽃 이름과 CSV 꽃말의 직접 검색은 인덱스가 비어 있어도 동작합니다.

## 웹 실행

```powershell
cd C:\fastapiworkspace\flowerproject
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

`run.bat`으로도 같은 서버를 시작할 수 있습니다. 브라우저에서 [홈](http://127.0.0.1:8000/), [꽃의 종류](http://127.0.0.1:8000/flowers), [꽃 챗봇](http://127.0.0.1:8000/chat), [API 문서](http://127.0.0.1:8000/docs)를 엽니다.

## API 및 기능 확인

| 기능 | 요청 | 예시 |
| --- | --- | --- |
| 로컬 꽃 목록 | `GET /api/flowers` | `GET /api/flowers?include_all=true` |
| 로컬 꽃 상세 | `GET /api/flowers/{name}` | `GET /api/flowers/Rose` |
| 이름·꽃말·유사 검색 | `POST /api/search` | `{"query":"사랑","limit":5}` |
| 꽃 챗봇 | `POST /api/chat` | `{"message":"장미의 꽃말을 알려줘","history":[]}` |
| 오늘의 꽃 | `GET /api/today-flower` | 한국 날짜 기준으로 조회 |
| 공공 꽃 목록 | `GET /api/public-flowers` | 국립원예특작과학원 목록 조회 |
| 공공 꽃 상세 | `GET /api/public-flowers/{data_no}` | `GET /api/public-flowers/140` |

웹 실행 후 홈에서 꽃 이름이나 꽃말을 검색하고, 꽃 카드를 눌러 상세창을 확인합니다. 공공 API 키가 있다면 **공공데이터** 필터와 상세창을 확인합니다. 임베딩을 생성한 뒤 유사 검색을 확인하고, OpenAI 키가 있다면 챗봇에 꽃 정보를 질문합니다.

## MCP 서버 실행 및 연결

프로젝트 루트에서 표준 입출력 서버를 실행합니다.

```powershell
cd C:\fastapiworkspace\flowerproject
.\.venv\Scripts\python.exe -m backend.mcp_server.server
```

MCP 클라이언트 설정 예시입니다. 경로는 프로젝트를 설치한 위치에 맞게 바꿉니다.

```json
{
  "mcpServers": {
    "flower-garden": {
      "command": "C:\\fastapiworkspace\\flowerproject\\.venv\\Scripts\\python.exe",
      "args": ["-m", "backend.mcp_server.server"],
      "env": {
        "PYTHONPATH": "C:\\fastapiworkspace\\flowerproject"
      }
    }
  }
}
```

| 도구 | 기능 | 인수 예시 |
| --- | --- | --- |
| `search_flowers` | 이름, 꽃말, 유사 꽃 검색 | `{"query":"사랑","limit":5}` |
| `get_flower` | 등록된 꽃 상세 정보 조회 | `{"name":"장미"}` |
| `list_flowers` | 등록된 꽃 목록 조회 | `{"limit":10}` |

MCP 도구는 로컬 도감을 사용합니다. 유사 검색에는 ChromaDB 인덱스가 필요합니다. FastAPI에는 Streamable HTTP MCP가 마운트되어 있으며, 현재 실행 구성에서 `/mcp/mcp` 초기화는 HTTP 500을 반환합니다. 연결에는 초기화가 검증된 stdio 방식을 사용합니다.
