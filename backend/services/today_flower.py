from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode, urlsplit, urlunsplit
from urllib.request import urlopen
from xml.etree import ElementTree

from backend.config import settings


FLOWER_API_URL = "https://apis.data.go.kr/1390804/NihhsTodayFlowerInfo01"
KOREA_TIME = timezone(timedelta(hours=9))
MAX_RESPONSE_BYTES = 1_000_000


class TodayFlowerError(Exception):
    pass


class MissingFlowerApiKey(TodayFlowerError):
    pass


def get_today_flower() -> dict[str, str]:
    return _get_flower_for_date(_today())


def list_public_flowers() -> list[dict[str, str]]:
    return _list_for_date(_today())


def get_public_flower(data_no: int) -> dict[str, str]:
    return _get_detail(_today(), data_no)


def _today() -> date:
    return datetime.now(KOREA_TIME).date()


@lru_cache(maxsize=2)
def _get_flower_for_date(day: date) -> dict[str, str]:
    root = _request_flowers("selectTodayFlower01", fMonth=day.month, fDay=day.day)
    return _single_flower(root)


@lru_cache(maxsize=2)
def _list_for_date(day: date) -> list[dict[str, str]]:
    root = _request_flowers("selectTodayFlowerList01", pageNo=1, numOfRows=366)
    flowers = [_parse_flower(result) for result in root.findall("result")]
    if not flowers or any(not flower["name"] or not flower["data_no"].isdigit() for flower in flowers):
        raise TodayFlowerError("upstream returned an invalid flower list")
    try:
        expected = int(root.findtext("resultCnt") or "")
    except ValueError:
        raise TodayFlowerError("upstream omitted the flower count") from None
    if len(flowers) != expected:
        raise TodayFlowerError("upstream returned an incomplete flower list")

    today = (str(day.month), str(day.day))
    return sorted(flowers, key=lambda flower: (flower["month"], flower["day"]) != today)


@lru_cache(maxsize=384)
def _get_detail(day: date, data_no: int) -> dict[str, str]:
    root = _request_flowers("selectTodayFlowerView01", dataNo=data_no)
    return _single_flower(root)


def _request_flowers(operation: str, **parameters: int) -> ElementTree.Element:
    key = settings.flower_api_key.get_secret_value().strip() if settings.flower_api_key else ""
    if not key:
        raise MissingFlowerApiKey

    query = urlencode({"serviceKey": unquote(key), **parameters})
    try:
        with urlopen(f"{FLOWER_API_URL}/{operation}?{query}", timeout=8) as response:
            payload = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        status = error.code
        error.close()
        raise TodayFlowerError(f"upstream HTTP {status}") from None
    except (URLError, OSError):
        raise TodayFlowerError("upstream connection failed") from None

    if len(payload) > MAX_RESPONSE_BYTES:
        raise TodayFlowerError("upstream response exceeded its documented size")
    try:
        document = ElementTree.fromstring(payload)
    except ElementTree.ParseError:
        raise TodayFlowerError("upstream returned invalid XML") from None

    root = document if document.tag == "root" else document.find("root")
    if root is None or (root.findtext("resultCode") or "").strip() != "1":
        code = (document.findtext(".//returnReasonCode") or "").strip()
        suffix = f" ({code})" if code.isascii() and code.isdecimal() and len(code) <= 2 else ""
        raise TodayFlowerError(f"upstream rejected the request{suffix}")
    return root


def _single_flower(root: ElementTree.Element) -> dict[str, str]:
    result = root.find("result")
    if result is None or not (result.findtext("flowNm") or "").strip():
        raise TodayFlowerError("upstream returned no flower")
    return _parse_flower(result)


def _parse_flower(result: ElementTree.Element) -> dict[str, str]:
    fields = {
        "data_no": "dataNo",
        "month": "fMonth",
        "day": "fDay",
        "name": "flowNm",
        "english": "fEngNm",
        "scientific_name": "fSctNm",
        "language": "flowLang",
        "description": "fContent",
        "usage": "fUse",
        "care": "fGrow",
        "habitat": "fType",
        "publisher": "publishOrg",
    }
    flower = {name: (result.findtext(tag) or "").strip() for name, tag in fields.items()}
    for index in range(1, 4):
        image = urlsplit((result.findtext(f"imgUrl{index}") or "").strip())
        if (
            image.scheme in ("http", "https")
            and image.netloc.lower() in ("nihhs.go.kr", "www.nihhs.go.kr")
            and image.path.startswith(("/Attfiles/FLOWF/", "/user/AttachFiles/FLOWF/"))
        ):
            flower["image_url"] = urlunsplit(("https", image.netloc, image.path, "", ""))
            break
    return flower
