const form = document.getElementById("search-form");
const query = document.getElementById("query");
const results = document.getElementById("results");
const status = document.getElementById("status");

const flowerImages = {
    "장미": "photo-1518895949257-7621c3c786d7",
    "라벤더": "photo-1470252649378-9c29740c9fa8",
    "해바라기": "photo-1470509037663-253afd7f0f51",
    "국화": "photo-1508610048659-a06b669e3321",
    "튤립": "photo-1520763185298-1b434c919102",
    "카네이션": "photo-1494972308805-463bc619d34e",
    "벚꽃": "photo-1522383225653-ed111181a951",
    "수국": "photo-1508610048659-a06b669e3321"
};
const fallbackImage = "photo-1490750967868-88aa4486c946";

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "꽃말 정보를 찾고 있어요...";
    results.innerHTML = "";

    try {
        const response = await fetch("/api/search", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({query: query.value, limit: 6})
        });
        if (!response.ok) throw new Error("꽃 검색에 실패했습니다.");
        const data = await response.json();
        render(data.results, true);
    } catch (error) {
        status.textContent = error.message || "검색 중 오류가 발생했습니다.";
    }
});

document.querySelectorAll(".topic-chip").forEach((button) => {
    button.addEventListener("click", () => {
        query.value = button.dataset.query;
        form.requestSubmit();
    });
});

const initialQuery = new URLSearchParams(window.location.search).get("q");
if (initialQuery) {
    query.value = initialQuery;
    form.requestSubmit();
}

async function loadFlowers() {
    try {
        const response = await fetch("/api/flowers?limit=8");
        if (!response.ok) throw new Error("꽃 목록을 불러오지 못했습니다.");
        const data = await response.json();
        render(data.flowers, false);
    } catch (error) {
        status.textContent = error.message;
    }
}

function render(flowers, isSearch) {
    if (!flowers || flowers.length === 0) {
        status.textContent = isSearch
            ? "아직 그 마음에 꼭 맞는 꽃을 찾지 못했어요. 다른 표현으로 검색해 보세요."
            : "꽃 데이터가 없습니다. 개발자가 꽃 데이터 임베딩을 먼저 실행해 주세요.";
        results.innerHTML = `<div class="empty-state">${escapeHtml(status.textContent)}</div>`;
        return;
    }

    status.textContent = isSearch
        ? `${flowers.length}개의 꽃말 정보를 찾았어요`
        : `${String(flowers.length).padStart(2, "0")} FLOWERS TO DISCOVER`;
    results.innerHTML = flowers.map((flower, index) => {
        const image = flowerImages[flower.name] || fallbackImage;
        const imageUrl = `https://images.unsplash.com/${image}?auto=format&fit=crop&w=700&q=80`;
        return `
            <a class="flower-card" href="/flowers/${encodeURIComponent(flower.name)}" aria-label="${escapeHtml(flower.name)} 상세 정보 보기">
                <div class="flower-photo">
                    <img src="${imageUrl}" alt="${escapeHtml(flower.name)}" loading="lazy"
                         onerror="this.src='https://images.unsplash.com/${fallbackImage}?auto=format&fit=crop&w=700&q=80'">
                    <span class="flower-number">F. ${String(index + 1).padStart(2, "0")}</span>
                </div>
                <div class="flower-info">
                    <div class="flower-meta">
                        <span class="flower-kind">${escapeHtml(flower.type)}</span>
                        <span class="flower-color">${escapeHtml(flower.color)}</span>
                    </div>
                    <h3>${escapeHtml(flower.name)}</h3>
                    <p class="flower-language">“${escapeHtml(flower.language)}”</p>
                    <p class="flower-meaning">${escapeHtml(flower.meaning)}</p>
                    <div class="flower-details">
                        <span>⌖ ${escapeHtml(flower.origin)}</span>
                        <span>◷ ${escapeHtml(flower.season)}</span>
                    </div>
                </div>
            </a>
        `;
    }).join("");
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML;
}

loadFlowers();
