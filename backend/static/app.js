const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const messages = document.getElementById("chat-messages");
const sendButton = document.getElementById("send-button");
const newChatButton = document.getElementById("new-chat");
const conversation = [];

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

newChatButton?.addEventListener("click", resetChat);

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
        appendAssistant(data.answer);
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

function appendAssistant(text) {
    const row = document.createElement("div");
    row.className = "message-row assistant";
    row.innerHTML = `<span class="message-avatar" aria-hidden="true">🌸</span>`;
    const content = document.createElement("div");
    content.className = "assistant-content";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    content.appendChild(bubble);

    row.appendChild(content);
    messages.appendChild(row);
    scrollToLatest();
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
