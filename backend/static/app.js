const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const messages = document.getElementById("chat-messages");
const sendButton = document.getElementById("send-button");
const newChatButton = document.getElementById("new-chat");
const conversation = [];

const flowerImages = {
    "장미": "photo-1490750967868-88aa4486c946",
    "라벤더": "photo-1470252649378-9c29740c9fa8",
    "해바라기": "photo-1470509037663-253afd7f0f51",
    "국화": "photo-1508610048659-a06b669e3321",
    "튤립": "photo-1520763185298-1b434c919102",
    "카네이션": "photo-1494972308805-463bc619d34e",
    "벚꽃": "photo-1522383225653-ed111181a951",
    "수국": "photo-1508610048659-a06b669e3321"
};
const fallbackImage = "photo-1490750967868-88aa4486c946";

form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
});

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
});

messages.addEventListener("click", (event) => {
    const suggestion = event.target.closest("[data-message]");
    if (!suggestion) return;
    input.value = suggestion.dataset.message;
    form.requestSubmit();
});

newChatButton.addEventListener("click", resetChat);

async function sendMessage() {
    const message = input.value.trim();
    if (!message || sendButton.disabled) return;

    const welcome = messages.querySelector(".welcome-message");
    if (welcome) welcome.remove();
    appendMessage("user", message);
    input.value = "";
    input.style.height = "auto";
    sendButton.disabled = true;
    const typing = appendTyping();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({message, history: conversation.slice(-6)})
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "메시지를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
        typing.remove();
        conversation.push({role: "user", content: message});
        conversation.push({role: "assistant", content: data.answer});
        appendAssistant(data.answer, data.flowers);
    } catch (error) {
        typing.remove();
        appendMessage("assistant", error.message);
    } finally {
        sendButton.disabled = false;
        input.focus();
    }
}

function appendMessage(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;
    if (role === "assistant") {
        row.innerHTML = `<span class="message-avatar" aria-hidden="true">🌸</span>`;
    }
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollToLatest();
    return row;
}

function appendAssistant(text, flowers) {
    const row = document.createElement("div");
    row.className = "message-row assistant";
    row.innerHTML = `<span class="message-avatar" aria-hidden="true">🌸</span>`;
    const content = document.createElement("div");
    content.className = "assistant-content";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    content.appendChild(bubble);

    if (flowers.length) {
        const recommendations = document.createElement("div");
        recommendations.className = "recommendations";
        recommendations.innerHTML = `<p class="recommendation-title">당신의 마음에 어울리는 꽃</p>`;
        flowers.forEach((flower, index) => {
            recommendations.appendChild(createFlowerCard(flower, index));
        });
        content.appendChild(recommendations);
    }
    row.appendChild(content);
    messages.appendChild(row);
    scrollToLatest();
}

function createFlowerCard(flower, index) {
    const card = document.createElement("article");
    card.className = "recommendation-card";
    const imageId = flowerImages[flower.name] || fallbackImage;
    const image = document.createElement("img");
    image.src = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=180&h=180&q=75`;
    image.alt = flower.name;
    image.loading = "lazy";
    image.onerror = () => {
        image.onerror = null;
        image.src = `https://images.unsplash.com/${fallbackImage}?auto=format&fit=crop&w=180&h=180&q=75`;
    };

    const details = document.createElement("div");
    details.className = "recommendation-details";
    const label = document.createElement("span");
    label.className = "recommendation-label";
    label.textContent = `추천 ${String(index + 1).padStart(2, "0")} · ${flower.type || "꽃"}`;
    const title = document.createElement("h3");
    title.textContent = flower.name;
    const language = document.createElement("p");
    language.className = "recommendation-language";
    language.textContent = `꽃말 · ${flower.language}`;
    const meaning = document.createElement("p");
    meaning.className = "recommendation-meaning";
    meaning.textContent = flower.meaning;
    const meta = document.createElement("span");
    meta.className = "recommendation-meta";
    meta.textContent = `${flower.color} · ${flower.season}`;
    details.append(label, title, language, meaning, meta);
    card.append(image, details);
    return card;
}

function appendTyping() {
    const row = document.createElement("div");
    row.className = "message-row assistant typing-row";
    row.innerHTML = `<span class="message-avatar" aria-hidden="true">🌸</span><div class="message-bubble typing"><i></i><i></i><i></i></div>`;
    messages.appendChild(row);
    scrollToLatest();
    return row;
}

function resetChat() {
    conversation.length = 0;
    messages.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-bubble">
                안녕하세요! <span aria-hidden="true">🌸</span><br>
                저는 꽃 챗봇이에요!<br>
                궁금한 꽃의 정보나 꽃말을 알려드릴게요.<br>
                어떤 것이 궁금하신가요? <span aria-hidden="true">😊</span>
            </div>
            <div class="suggestion-heading"><span></span><strong>추천 질문</strong><span></span></div>
            <div class="suggestions">
                <button type="button" class="suggestion" data-message="장미에 대해 알려줘요"><span aria-hidden="true">🌸</span> 장미에 대해 알려줘요</button>
                <button type="button" class="suggestion" data-message="튤립의 꽃말은?"><span aria-hidden="true">🌸</span> 튤립의 꽃말은?</button>
                <button type="button" class="suggestion" data-message="해바라기의 의미는?"><span aria-hidden="true">🌸</span> 해바라기의 의미는?</button>
                <button type="button" class="suggestion" data-message="수국은 어떤 꽃인가요?"><span aria-hidden="true">🌸</span> 수국은 어떤 꽃인가요?</button>
                <button type="button" class="suggestion" data-message="예쁜 꽃 추천해줘요!"><span aria-hidden="true">🌸</span> 예쁜 꽃 추천해줘요!</button>
            </div>
        </div>`;
    input.value = "";
    input.focus();
}

function scrollToLatest() {
    messages.scrollTop = messages.scrollHeight;
}
