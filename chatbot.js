// chatbot.html — 경제 상식 전반에 대한 자유 질문응답 챗봇
// 대화 기록은 sessionStorage(CHATBOT_HISTORY_KEY)에 저장되어 탭 이동 중에는 유지되고,
// 탭을 닫거나 새로고침하면 초기화됩니다.

document.addEventListener("DOMContentLoaded", () => {
  const messagesEl = document.getElementById("chatbot-messages");
  const formEl = document.getElementById("chatbot-form");
  const inputEl = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send-btn");

  let messages = loadHistory();
  let isSending = false;

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(CHATBOT_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    sessionStorage.setItem(CHATBOT_HISTORY_KEY, JSON.stringify(messages));
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function buildBubble(msg) {
    const row = document.createElement("div");
    row.className = "chat-message " + (msg.role === "user" ? "chat-message-user" : "chat-message-ai");

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble " + (msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai");
    bubble.textContent = msg.text;

    row.appendChild(bubble);
    return row;
  }

  function renderMessages() {
    messagesEl.innerHTML = "";

    if (messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "chat-empty-state";
      empty.textContent = '경제와 관련된 궁금한 점을 자유롭게 물어보세요. 예: "환율이 오르면 수출 기업에 왜 유리한가요?"';
      messagesEl.appendChild(empty);
      return;
    }

    messages.forEach((msg) => {
      messagesEl.appendChild(buildBubble(msg));
    });
    scrollToBottom();
  }

  function appendTypingIndicator() {
    const row = document.createElement("div");
    row.className = "chat-message chat-message-ai";
    row.id = "chat-typing-indicator";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bubble-ai chat-typing";
    bubble.innerHTML =
      '<span class="typing-dots"><span></span><span></span><span></span></span>답변을 생각하고 있어요...';

    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById("chat-typing-indicator");
    if (el) el.remove();
  }

  function appendErrorBubble(onRetry) {
    const row = document.createElement("div");
    row.className = "chat-message chat-message-ai";
    row.id = "chat-error-bubble";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bubble-error";

    const text = document.createElement("p");
    text.className = "chat-error-text";
    text.textContent = "답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.";

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "btn btn-secondary btn-sm chat-retry-btn";
    retryBtn.textContent = "다시 시도";
    retryBtn.addEventListener("click", () => {
      if (retryBtn.disabled) return;
      retryBtn.disabled = true;
      setTimeout(() => {
        retryBtn.disabled = false;
      }, 2000);
      row.remove();
      requestReply(onRetry);
    });

    bubble.appendChild(text);
    bubble.appendChild(retryBtn);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function setSending(sending) {
    isSending = sending;
    inputEl.disabled = sending;
    sendBtn.disabled = sending;
  }

  async function requestReply(retryFn) {
    setSending(true);
    appendTypingIndicator();

    try {
      const reply = await fetchChatReply(messages);
      removeTypingIndicator();
      messages.push({ role: "model", text: reply });
      saveHistory();
      renderMessages();
    } catch (err) {
      console.error("[chatbot] Gemini API 호출 실패:", err);
      removeTypingIndicator();
      appendErrorBubble(retryFn || (() => requestReply()));
    } finally {
      setSending(false);
    }
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isSending) return;

    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    messages.push({ role: "user", text });
    saveHistory();
    renderMessages();

    requestReply();
  });

  renderMessages();
});
