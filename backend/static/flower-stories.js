const storyList = document.getElementById("flower-stories");
const storyCount = document.getElementById("stories-count");
const colorOptions = document.getElementById("story-color-options");
const detailModal = document.getElementById("story-detail-modal");
const modalCloseButtons = detailModal.querySelectorAll(".story-modal-close, .story-modal-dismiss");

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
const colorSwatches = {
    "빨강": "#c94d59",
    "분홍": "#e9a0b0",
    "연분홍": "#f4cbd2",
    "노랑": "#f1cf68",
    "주황": "#e99555",
    "흰색": "#fffdf8",
    "보라": "#9c7bc0",
    "연보라": "#c3add9",
    "파랑": "#719fc9",
    "자주": "#984c78",
    "연두": "#a7bd79",
    "갈색": "#9a6d4b"
};
const flowerIcons = {
    "장미": "🌹",
    "라벤더": "🪻",
    "해바라기": "🌻",
    "국화": "🌼",
    "튤립": "🌷",
    "카네이션": "🌺",
    "벚꽃": "🌸",
    "수국": "💜",
    "안개꽃": "💮",
    "데이지": "🌼",
    "작약": "🌸",
    "프리지아": "🌼"
};
let flowers = [];
let selectedCategory = "전체";
let lastFocusedElement = null;
const categories = [
    ["전체", "❀"],
    ["사랑", "🌹"],
    ["우정", "🪻"],
    ["행복", "🌻"],
    ["희망", "🌸"],
    ["감사", "🌷"],
    ["기타", "🌼"]
];

async function loadStories() {
    try {
        const response = await fetch("/api/flowers?limit=100");
        if (!response.ok) throw new Error("꽃말 이야기를 불러오지 못했습니다.");
        const data = await response.json();
        flowers = data.flowers || [];

        if (!flowers.length) {
            storyCount.textContent = "0 FLOWER STORIES";
            storyList.innerHTML = `<p class="stories-message">아직 등록된 꽃말 이야기가 없어요. 꽃 데이터를 먼저 등록해 주세요.</p>`;
            return;
        }

        createColorOptions();
        renderStories();
    } catch (error) {
        storyCount.textContent = "";
        storyList.innerHTML = `<p class="stories-message">${escapeHtml(error.message || "꽃말 이야기를 불러오지 못했습니다.")}</p>`;
    }
}

function getFlowerColors(flower) {
    return String(flower.color || "")
        .split(/[,，、]/)
        .map((color) => color.trim())
        .filter(Boolean);
}

function matchesCategory(flower, category) {
    const text = [flower.language, flower.meaning, flower.description, flower.name]
        .filter(Boolean).join(" ");
    const patterns = {
        "사랑": /사랑|애정|열정|기념|고백/,
        "우정": /우정|친구|우애/,
        "행복": /행복|기쁨|희망|밝|축/,
        "희망": /희망|기대|새로운|순수|용기/,
        "감사": /감사|존경|경의|맑은/
    };
    return patterns[category]?.test(text) || false;
}

function createColorOptions() {
    colorOptions.replaceChildren(...categories.map(([category, icon]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `story-category-chip${selectedCategory === category ? " active" : ""}`;
        button.dataset.category = category;
        button.setAttribute("aria-pressed", String(selectedCategory === category));
        const iconElement = document.createElement("span");
        iconElement.className = "category-icon";
        iconElement.textContent = icon;
        iconElement.setAttribute("aria-hidden", "true");
        button.append(iconElement, document.createTextNode(category));
        button.addEventListener("click", () => {
            selectedCategory = category;
            updateColorOptions();
            renderStories();
        });
        return button;
    }));
}

function updateColorOptions() {
    colorOptions.querySelectorAll(".story-category-chip").forEach((button) => {
        const active = button.dataset.category === selectedCategory;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function renderStories() {
    const visibleFlowers = flowers.filter((flower) => {
        if (selectedCategory === "전체") return true;
        if (selectedCategory === "기타") return !matchesCategory(flower, "사랑")
            && !matchesCategory(flower, "우정")
            && !matchesCategory(flower, "행복")
            && !matchesCategory(flower, "희망")
            && !matchesCategory(flower, "감사");
        return matchesCategory(flower, selectedCategory);
    });
    storyCount.textContent = `${visibleFlowers.length} FLOWER STORIES`;

    if (!visibleFlowers.length) {
        storyList.innerHTML = `<p class="stories-message">이 색깔에 해당하는 꽃이 없어요.</p>`;
        return;
    }

    storyList.innerHTML = visibleFlowers.map((flower) => {
            const image = flowerImages[flower.name] || fallbackImage;
            const imageUrl = `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`;
            const name = escapeHtml(flower.name);
            const colorTags = getFlowerColors(flower).map((color) => `
                <span class="story-color-tag">
                    <span class="story-color-swatch" style="background-color:${colorSwatches[color] || "#d8c6c1"}" aria-hidden="true"></span>
                    ${escapeHtml(color)}
                </span>`).join("");
            return `
                <article class="story-card">
                    <div class="story-card-image">
                        <img src="${imageUrl}" alt="${name}" loading="lazy"
                             onerror="this.src='https://images.unsplash.com/${fallbackImage}?auto=format&fit=crop&w=800&q=80'">
                        <span class="story-card-type">${escapeHtml(flower.type || "꽃")}</span>
                    </div>
                    <div class="story-card-copy">
                        <p class="story-card-kicker">THE LANGUAGE OF FLOWERS</p>
                        <h3>${name}</h3>
                        <p class="story-card-language">꽃말 · ${escapeHtml(flower.language || "아직 등록되지 않았어요")}</p>
                        <p class="story-card-meaning">${escapeHtml(flower.meaning || "꽃이 전하는 의미를 준비하고 있어요.")}</p>
                        <div class="story-card-colors" aria-label="꽃 색깔">${colorTags}</div>
                        <button class="story-card-link" type="button" data-flower-name="${escapeHtml(flower.name)}">이 꽃 더 알아보기 <span aria-hidden="true">›</span></button>
                    </div>
                </article>`;
        }).join("");

    storyList.querySelectorAll(".story-card-link").forEach((button) => {
        button.addEventListener("click", () => {
            const flower = flowers.find((item) => item.name === button.dataset.flowerName);
            if (flower) openFlowerDetails(flower, button);
        });
    });
}

function openFlowerDetails(flower, trigger) {
    const imageId = flowerImages[flower.name] || fallbackImage;
    const image = document.getElementById("story-modal-image");
    image.onerror = () => {
        image.onerror = null;
        image.src = `https://images.unsplash.com/${fallbackImage}?auto=format&fit=crop&w=1100&q=90`;
    };
    image.src = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1100&q=90`;
    image.alt = `${flower.name} 사진`;
    document.getElementById("story-modal-icon").textContent = flowerIcons[flower.name] || "🌸";
    document.getElementById("story-modal-korean-name").textContent = flower.name;
    document.getElementById("story-modal-english-name").textContent =
        `(${flower.english || flower.type || "Flower"})`;
    document.getElementById("story-modal-summary").textContent =
        `${flower.type} · ${flower.language}`;
    document.getElementById("story-modal-description").textContent =
        flower.description || `${flower.name}은(는) ${flower.language}의 꽃말을 지니며, ${flower.meaning}의 의미를 전합니다.`;
    document.getElementById("story-modal-language").textContent = flower.language;
    document.getElementById("story-modal-color").textContent = flower.color;
    document.getElementById("story-modal-origin").textContent = flower.origin;
    document.getElementById("story-modal-season").textContent = flower.season;
    document.getElementById("story-modal-features").textContent = flower.features;
    document.getElementById("story-modal-care").textContent = flower.care;
    document.getElementById("story-modal-note").textContent =
        `${flower.name}은(는) ${flower.meaning}의 의미를 전하는 꽃입니다.`;
    detailModal.hidden = false;
    document.body.classList.add("story-modal-open");
    lastFocusedElement = trigger;
    detailModal.querySelector(".story-modal-close").focus();
}

function closeFlowerDetails() {
    if (detailModal.hidden) return;
    detailModal.hidden = true;
    document.body.classList.remove("story-modal-open");
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

loadStories();
