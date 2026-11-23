const list = document.getElementById("flower-list");
const typeFilters = document.getElementById("type-filters");
const searchForm = document.getElementById("flower-search");
const searchInput = document.getElementById("flower-query");
const count = document.getElementById("flower-count");
const detailModal = document.getElementById("flower-detail-modal");
const modalCloseButtons = detailModal.querySelectorAll(".flower-modal-close, .modal-dismiss");

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
const filterCategories = [["전체", "🌼"], ...categories, ["기타", "🌷"]];
const flowerImages = {
    "장미": "/static/flowers/01_rose.png",
    "라벤더": "/static/flowers/02_lavender.png",
    "해바라기": "/static/flowers/03_sunflower.png",
    "국화": "/static/flowers/04_chrysanthemum.png",
    "튤립": "/static/flowers/05_tulip.png",
    "카네이션": "/static/flowers/06_carnations.png",
    "벚꽃": "/static/flowers/07_cherry blossoms.png",
    "수국": "/static/flowers/08_hydrangea.png",
    "안개꽃": "/static/flowers/09_gypsophila.png",
    "데이지": "/static/flowers/10_daisy.png",
    "작약": "/static/flowers/11_peony.png",
    "프리지아": "/static/flowers/12_freesia.png"
};
const fallbackImage = "/static/flowers/01_rose.png";
let flowers = [];
let selectedType = "전체";
let searchTerm = "";
const featuredNames = new Set(categories.map(([name]) => name));
let lastFocusedElement = null;

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchTerm = searchInput.value.trim().toLocaleLowerCase();
    render();
});

async function loadFlowers() {
    list.innerHTML = `<p class="type-empty">꽃을 불러오는 중입니다...</p>`;
    try {
        const response = await fetch("/api/flowers?limit=100");
        if (!response.ok) throw new Error("꽃 목록을 불러오지 못했습니다.");
        const data = await response.json();
        flowers = data.flowers || [];
        if (selectedType !== "전체" && !flowers.some((flower) => flower.name === selectedType)) {
            selectedType = "전체";
        }
        createFilters();
        render();
    } catch (error) {
        list.innerHTML = `<p class="type-empty">${escapeHtml(error.message)}</p>`;
        count.textContent = "";
    }
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
    const visibleFlowers = flowers.filter((flower) => {
        const matchesType =
            selectedType === "전체" ||
            flower.name === selectedType;
        const searchable = [flower.name, flower.type, flower.language, flower.meaning, flower.color]
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
        const image = flowerImages[flower.name] || fallbackImage;
        return `
            <button class="flower-card" type="button" data-flower-name="${escapeHtml(flower.name)}" aria-label="${escapeHtml(flower.name)} 상세 정보 보기">
                <div class="flower-photo">
                    <img src="${image}" alt="${escapeHtml(flower.name)}" loading="lazy"
                         onerror="this.src='${fallbackImage}'">
                    <span class="flower-number">F. ${String(index + 1).padStart(2, "0")}</span>
                </div>
                <div class="flower-info">
                    <div class="flower-meta">
                        <span class="flower-kind">${escapeHtml(flower.type)}</span>
                        <span class="flower-color">${escapeHtml(flower.color)}</span>
                    </div>
                    <h3>${escapeHtml(flower.name)}</h3>
                    <p class="flower-language">${escapeHtml(flower.language)}</p>
                    <span class="type-detail">자세히 보기 <span aria-hidden="true">›</span></span>
                </div>
            </button>`;
    }).join("");

    list.querySelectorAll(".flower-card").forEach((card) => {
        card.addEventListener("click", () => {
            const flower = flowers.find((item) => item.name === card.dataset.flowerName);
            if (flower) openFlowerDetails(flower, card);
        });
    });
}

function openFlowerDetails(flower, trigger) {
    const image = flowerImages[flower.name] || fallbackImage;
    const modalImage = document.getElementById("modal-flower-image");
    modalImage.onerror = () => {
        modalImage.onerror = null;
        modalImage.src = fallbackImage;
    };
    modalImage.src = image;
    modalImage.alt = `${flower.name} 사진`;
    document.getElementById("modal-flower-icon").textContent =
        categories.find(([name]) => name === flower.name)?.[1] || "🌸";
    document.getElementById("modal-flower-korean-name").textContent = flower.name;
    document.getElementById("modal-flower-english-name").textContent =
        `(${flower.english || flower.type})`;
    document.getElementById("modal-flower-summary").textContent =
        `${flower.type} · ${flower.language}`;
    document.getElementById("modal-flower-description").textContent =
        flower.description || `${flower.name}은(는) ${flower.meaning}의 의미를 담고 있습니다.`;
    document.getElementById("modal-flower-language").textContent = flower.language;
    document.getElementById("modal-flower-color").textContent = flower.color;
    document.getElementById("modal-flower-origin").textContent = flower.origin;
    document.getElementById("modal-flower-season").textContent = flower.season;
    document.getElementById("modal-flower-features").textContent = flower.features;
    document.getElementById("modal-flower-tip").textContent =
        flower.care || flower.features || `${flower.name}의 꽃말은 ${flower.language}입니다.`;
    detailModal.hidden = false;
    document.body.classList.add("modal-open");
    lastFocusedElement = trigger;
    detailModal.querySelector(".flower-modal-close").focus();
}

function closeFlowerDetails() {
    if (detailModal.hidden) return;
    detailModal.hidden = true;
    document.body.classList.remove("modal-open");
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
    const focusable = [...detailModal.querySelectorAll("button:not(:disabled)")];
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
    return element.innerHTML;
}

loadFlowers();
