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
    "장미": "photo-1518895949257-7621c3c786d7",
    "라벤더": "photo-1470252649378-9c29740c9fa8",
    "해바라기": "photo-1470509037663-253afd7f0f51",
    "국화": "photo-1508610048659-a06b669e3321",
    "튤립": "photo-1520763185298-1b434c919102",
    "카네이션": "photo-1518709766631-a6a7f45921c3",
    "벚꽃": "photo-1522383225653-ed111181a951",
    "수국": "photo-1469259947269-3f74a5d3d5e7",
    "안개꽃": "photo-1497250681960-ef046c08a56e",
    "데이지": "photo-1490750967868-88aa4486c946",
    "작약": "photo-1523438885200-e635ba2c371e",
    "프리지아": "photo-1490750967868-88aa4486c946"
};
const fallbackImage = "photo-1490750967868-88aa4486c946";
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
        const imageUrl = `https://images.unsplash.com/${image}?auto=format&fit=crop&w=700&q=80`;
        return `
            <button class="flower-card" type="button" data-flower-name="${escapeHtml(flower.name)}" aria-label="${escapeHtml(flower.name)} 상세 정보 보기">
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
    const imageUrl = `https://images.unsplash.com/${image}?auto=format&fit=crop&w=1100&q=90`;
    const modalImage = document.getElementById("modal-flower-image");
    modalImage.onerror = () => {
        modalImage.onerror = null;
        modalImage.src = `https://images.unsplash.com/${fallbackImage}?auto=format&fit=crop&w=1100&q=90`;
    };
    modalImage.src = imageUrl;
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
