const list = document.getElementById("flower-list");
const typeFilters = document.getElementById("type-filters");
const searchForm = document.getElementById("flower-search");
const searchInput = document.getElementById("flower-query");
const count = document.getElementById("flower-count");
const detailModal = document.getElementById("flower-detail-modal");
const modalCloseButtons = detailModal.querySelectorAll(".flower-modal-close, .modal-dismiss");
const selectedFlower = JSON.parse(document.getElementById("selected-flower").textContent);

const categories = [
    ["장미", "🌹"],
    ["튤립", "🌷"],
    ["수국", "💜"],
    ["해바라기", "🌻"],
    ["카네이션", "🌺"],
    ["벚꽃", "🌸"],
    ["안개꽃", "💮"],
    ["데이지", "🌼"]
];
const publicCategory = "공공데이터";
const referenceColorNames = {
    blue: "파랑", crimson: "진홍", pink: "분홍", purple: "보라",
    red: "빨강", striped: "줄무늬", white: "흰색", yellow: "노랑"
};
const filterCategories = [["전체", "🌼"], [publicCategory, "🌿"], ...categories, ["기타", "🌷"]];
const koreaToday = new Intl.DateTimeFormat("en-US", {timeZone: "Asia/Seoul", month: "numeric", day: "numeric"}).format(new Date());
const fallbackImage = "/static/flowers/01_rose.png";
let flowers = [];
let publicFlowers = [];
let selectedType = "전체";
let searchTerm = "";
const featuredNames = new Set(categories.map(([name]) => name));
let lastFocusedElement = null;
let publicDetailRequest = null;

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchTerm = searchInput.value.trim().toLocaleLowerCase();
    render();
});

async function loadFlowers() {
    list.innerHTML = `<p class="type-empty">꽃을 불러오는 중입니다...</p>`;
    const [catalog, publicCatalog] = await Promise.allSettled([
        fetchFlowerData("/api/flowers?include_all=true"),
        fetchFlowerData("/api/public-flowers")
    ]);
    if (catalog.status === "rejected" && publicCatalog.status === "rejected") {
        list.innerHTML = '<p class="type-empty">꽃 목록을 불러오지 못했습니다.</p>';
        count.textContent = "";
        return;
    }
    const localFlowers = catalog.value?.flowers || [];
    const referenceMatches = new Map(localFlowers
        .filter((flower) => flower.public_data_no && flower.photo)
        .map((flower) => [flower.public_data_no, flower]));
    publicFlowers = (publicCatalog.value?.flowers || [])
        .map((flower) => toPublicFlower(flower, referenceMatches.get(flower.data_no)));
    const publicById = new Map(publicFlowers.map((flower) => [flower.data_no, flower]));
    flowers = [
        ...localFlowers.flatMap((flower) => {
            const merged = flower.photo && publicById.get(flower.public_data_no);
            if (!merged) return [flower];
            return flower.reference_only ? [] : [merged];
        }),
        ...publicFlowers.filter((flower) => !flower.reference_match || flower.reference_match.reference_only)
    ];
    if (publicCatalog.status === "rejected") {
        const status = document.getElementById("public-flowers-status");
        status.textContent = "공공데이터 꽃 목록을 일시적으로 불러올 수 없습니다.";
        status.hidden = false;
    }
    createFilters();
    render();
}

async function fetchFlowerData(url, signal) {
    const response = await fetch(url, {signal});
    if (!response.ok) throw new Error("꽃 정보를 불러오지 못했습니다.");
    return response.json();
}

function toPublicFlower(flower, referenceMatch) {
    const date = `${Number(flower.month)}월 ${Number(flower.day)}일`;
    const isToday = `${Number(flower.month)}/${Number(flower.day)}` === koreaToday;
    return {
        ...flower,
        reference_match: referenceMatch,
        public_date: date,
        type: isToday ? "오늘의 꽃" : date,
        photo: referenceMatch?.photo || (flower.image_url ? {
            url: flower.image_url,
            source: "https://www.nihhs.go.kr/",
            credit: flower.publisher || "국립원예특작과학원"
        } : null)
    };
}

function createFilters() {
    typeFilters.replaceChildren(...filterCategories.map(([type, icon]) =>
        createFilterButton(type, icon, selectedType === type, (value) => {
            selectedType = value;
            updateActive(typeFilters, value);
            render();
        })
    ));
}

function createFilterButton(label, icon, active, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${active ? " active" : ""}`;
    button.dataset.label = label;
    button.setAttribute("aria-pressed", String(active));
    const iconElement = document.createElement("span");
    iconElement.className = "chip-icon";
    iconElement.textContent = icon;
    iconElement.setAttribute("aria-hidden", "true");
    button.append(iconElement);
    button.append(document.createTextNode(label));
    button.addEventListener("click", () => onClick(label));
    return button;
}

function updateActive(container, selected) {
    container.querySelectorAll(".filter-chip").forEach((button) => {
        const active = button.dataset.label === selected;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function render() {
    const source = selectedType === publicCategory ? publicFlowers : flowers;
    const visibleFlowers = source.filter((flower) => {
        const match = flower.reference_match;
        const matchesType =
            selectedType === "전체" ||
            flower.name === selectedType ||
            match?.korean_name === selectedType ||
            (selectedType === publicCategory && flower.data_no);
        const referenceTerms = (match?.reference_meanings || flower.reference_meanings || [])
            .flatMap(({color, meaning, meaning_en}) => [color, referenceColorNames[color], meaning, meaning_en]);
        const searchable = [flower.name, flower.korean_name, flower.english, flower.scientific_name, flower.type,
            flower.language, flower.meaning, flower.color, match?.name, match?.korean_name, match?.scientific_name, match?.language,
            ...referenceTerms]
            .filter(Boolean).join(" ").toLocaleLowerCase();
        return (matchesType || (selectedType === "기타" && !featuredNames.has(flower.name)))
            && searchable.includes(searchTerm);
    });

    count.textContent = `${visibleFlowers.length} FLOWERS`;
    if (!visibleFlowers.length) {
        list.innerHTML = `<p class="type-empty">조건에 맞는 꽃이 없어요. 필터를 바꾸거나 다른 이름으로 검색해 보세요.</p>`;
        return;
    }

    list.innerHTML = visibleFlowers.map((flower, index) => {
        const name = escapeHtml(flower.korean_name || flower.name);
        const color = flower.reference_only ? referenceColorNames[flower.color] || flower.color : flower.color;
        const image = getFlowerImageUrl(flower);
        const photo = flower.reference_only || flower.data_no
            ? `<span class="reference-flower-mark" aria-hidden="true">❀</span>
                ${flower.photo ? `<img class="reference-flower-image" src="${escapeHtml(flower.photo.url)}"
                    alt="${name}" loading="lazy" onerror="this.hidden=true">` : ""}`
            : `<img src="${escapeHtml(image || fallbackImage)}" alt="${escapeHtml(flower.name)}" loading="lazy"
                    onerror="this.onerror=null;this.src='${fallbackImage}'">`;
        return `
            <button class="flower-card" type="button" data-flower-name="${escapeHtml(flower.name)}"
                    data-catalog-name="${escapeHtml(flower.reference_match?.name || flower.name)}" aria-label="${name} 상세 정보 보기">
                <div class="flower-photo">
                    ${photo}
                    <span class="flower-number">F. ${String(index + 1).padStart(2, "0")}</span>
                </div>
                <div class="flower-info">
                    <div class="flower-meta">
                        ${flower.type ? `<span class="flower-kind">${escapeHtml(flower.type)}</span>` : ""}
                        ${color ? `<span class="flower-color">${escapeHtml(color)}</span>` : ""}
                    </div>
                    <h3>${name}</h3>
                    ${flower.korean_name && flower.korean_name !== flower.name
                        ? `<p class="reference-flower-name" lang="en">${escapeHtml(flower.name)}</p>` : ""}
                    <p class="flower-language">${escapeHtml(flower.language)}</p>
                    <span class="type-detail">자세히 보기 <span aria-hidden="true">›</span></span>
                </div>
            </button>`;
    }).join("");

    list.querySelectorAll(".flower-card").forEach((card, index) => {
        card.addEventListener("click", () => {
            openFlowerDetails(visibleFlowers[index], card);
        });
    });
}

function openFlowerDetails(flower, trigger) {
    publicDetailRequest?.abort();
    renderFlowerDetails(flower);
    detailModal.hidden = false;
    document.body.classList.add("modal-open");
    detailModal.querySelector(".flower-modal-panel").scrollTop = 0;
    lastFocusedElement = trigger;
    detailModal.querySelector(".flower-modal-close").focus();
    if (flower.data_no || flower.public_data_no) loadPublicDetail(flower);
}

function renderFlowerDetails(flower) {
    const modalImage = document.getElementById("modal-flower-image");
    const photo = flower.photo;
    const hasNoLocalImage = flower.reference_only || flower.data_no;
    detailModal.classList.toggle("reference-only", Boolean(flower.reference_only));
    detailModal.classList.toggle("public-flower", Boolean(flower.data_no));
    detailModal.classList.toggle("has-photo", Boolean(photo));
    modalImage.onerror = () => {
        modalImage.onerror = null;
        if (hasNoLocalImage) {
            detailModal.classList.remove("has-photo");
        } else {
            modalImage.src = fallbackImage;
        }
    };
    if (photo) {
        modalImage.src = photo.url;
    }
    if (photo?.credit) {
        const source = document.getElementById("modal-photo-source");
        source.href = photo.source;
        source.textContent = photo.credit;
        const license = document.getElementById("modal-photo-license");
        license.href = photo.license_url || photo.source;
        license.textContent = photo.license || "";
        license.hidden = !photo.license;
        source.parentElement.hidden = false;
    } else {
        document.querySelector(".modal-flower-credit").hidden = true;
    }
    if (hasNoLocalImage && !photo) {
        modalImage.removeAttribute("src");
    } else if (!photo) {
        modalImage.src = getFlowerImageUrl(flower) || fallbackImage;
    }
    const name = flower.korean_name || flower.name;
    modalImage.alt = `${name} 이미지`;
    document.getElementById("modal-flower-breadcrumb-name").textContent = name;
    document.getElementById("modal-flower-name").textContent = name;
    const englishName = document.getElementById("modal-flower-english-name");
    englishName.textContent = flower.english || "";
    englishName.hidden = !flower.english || flower.english === name;
    document.getElementById("modal-flower-summary").textContent =
        flower.name === "장미" && flower.language === "사랑과 열정"
            ? "사랑과 열정을 상징하는 아름다운 꽃"
            : flower.meaning || flower.language || flower.type || "";
    const description = document.getElementById("modal-flower-description");
    description.textContent = flower.reference_only && flower.description === flower.language ? "" : flower.description || "";
    description.lang = flower.description_lang || "ko";
    const catalogMatch = flower.reference_match?.reference_only ? undefined : flower.reference_match;
    renderFlowerMeanings("modal-flower-color-meanings", flower.color_meanings || catalogMatch?.color_meanings,
        ({color, meaning}) => `${color} · ${meaning}`);
    renderFlowerMeanings("modal-flower-count-meanings", flower.count_meanings, ({count, meaning}) => `${count}송이 · ${meaning}`);
    const details = document.getElementById("modal-flower-details");
    const isPublicFlower = Boolean(flower.data_no);
    document.getElementById("modal-flower-details-heading").textContent =
        isPublicFlower ? "국립원예특작과학원 꽃 정보" : "꽃 정보";
    document.getElementById("modal-public-flower-status").textContent = "";
    const language = catalogMatch
        ? [flower.language, catalogMatch.language].filter(Boolean).join(" / ")
        : flower.language;
    const fields = [
        ["기준 날짜", flower.public_date],
        ["학명", flower.scientific_name],
        ["영명", flower.english],
        ["꽃말", language],
        ["특징", flower.features],
        ["이용", flower.usage],
        ["기르기", flower.care],
        [flower.habitat ? "자생지" : "원산지", flower.habitat || flower.origin],
        ["출처", flower.details_publisher || flower.publisher]
    ].filter(([, value]) => value?.trim());
    document.getElementById("modal-flower-detail-facts").replaceChildren(
        ...fields.flatMap(([label, value]) => {
            const term = document.createElement("dt");
            const definition = document.createElement("dd");
            term.textContent = label;
            definition.textContent = value;
            return [term, definition];
        })
    );
    const sources = document.getElementById("modal-flower-profile-sources");
    const taxonomy = document.getElementById("modal-flower-taxonomy-source");
    const descriptionSource = document.getElementById("modal-flower-description-source");
    const detailsSource = document.getElementById("modal-flower-details-source");
    taxonomy.hidden = !flower.taxonomy_source;
    taxonomy.href = flower.taxonomy_source || "";
    descriptionSource.hidden = !flower.description_source;
    descriptionSource.href = flower.description_source || "";
    descriptionSource.textContent = flower.description_translated ? "영문 원문" : "설명 출처";
    detailsSource.hidden = !flower.details_source;
    detailsSource.href = flower.details_source || "";
    detailsSource.textContent = flower.details_source?.startsWith("https://en.wikipedia.org/")
        ? "위키피디아 출처" : "이용·재배·자생지 출처";
    document.getElementById("modal-flower-description-license").hidden =
        !flower.description_source?.includes(".wikipedia.org/");
    sources.hidden = taxonomy.hidden && descriptionSource.hidden && detailsSource.hidden;
    details.hidden = !flower.data_no && fields.length === 0 && sources.hidden;
}

function renderFlowerMeanings(id, meanings = [], format) {
    const list = document.getElementById(id);
    list.replaceChildren(...meanings.map((meaning) => {
        const item = document.createElement("li");
        item.textContent = format(meaning);
        return item;
    }));
    list.parentElement.hidden = meanings.length === 0;
}

async function loadPublicDetail(flower) {
    const controller = new AbortController();
    publicDetailRequest = controller;
    const status = document.getElementById("modal-public-flower-status");
    status.textContent = "상세 정보를 불러오는 중입니다…";
    try {
        const id = flower.data_no || flower.public_data_no;
        const data = await fetchFlowerData(`/api/public-flowers/${encodeURIComponent(id)}`, controller.signal);
        const referenceMatch = flower.data_no ? flower.reference_match : flower;
        if (!controller.signal.aborted) renderFlowerDetails(toPublicFlower(data.flower, referenceMatch));
    } catch {
        if (!controller.signal.aborted) status.textContent = "상세 정보를 불러오지 못했습니다.";
    }
}

function closeFlowerDetails() {
    if (detailModal.hidden) return;
    publicDetailRequest?.abort();
    detailModal.hidden = true;
    document.body.classList.remove("modal-open");
    const url = new URL(window.location.href);
    if (url.searchParams.has("flower")) {
        url.searchParams.delete("flower");
        window.history.replaceState(window.history.state, "", url);
    }
    lastFocusedElement?.focus();
}

modalCloseButtons.forEach((button) => button.addEventListener("click", closeFlowerDetails));
detailModal.addEventListener("click", (event) => {
    if (event.target === detailModal) closeFlowerDetails();
});
document.addEventListener("keydown", (event) => {
    if (detailModal.hidden) return;
    if (event.key === "Escape") {
        closeFlowerDetails();
        return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...detailModal.querySelectorAll("button:not(:disabled), a[href]")]
        .filter((element) => element.getClientRects().length);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML.replaceAll('"', "&quot;");
}

loadFlowers().then(() => {
    if (!selectedFlower) return;
    const flower = flowers.find((item) => item.reference_match?.name === selectedFlower.name)
        || selectedFlower;
    const card = [...list.querySelectorAll(".flower-card")].find(
        (item) => item.dataset.catalogName === selectedFlower.name
    );
    openFlowerDetails(flower, card || searchInput);
});
