// article-chatbot.js — lesson.html / overview.html / summary.html 공용
// 우측 하단 플로팅 "이 기사에 대해 질문하기" 챗봇 위젯.
//
// script.js의 fetchArticleChatReply(messages, articleText)를 그대로 사용해서,
// 지금 세션에 로드된 기사 본문을 컨텍스트로 넘겨 질문에 답한다.
// 대화 기록은 기사 본문 해시를 키로 sessionStorage(ARTICLE_CHAT_HISTORY_PREFIX + hash)에 저장되어
// lesson → overview → summary로 이동하는 동안에는 유지되고, 다른 기사를 새로 시작하면 초기화된다.

document.addEventListener("DOMContentLoaded", () => {
  const articleText = sessionStorage.getItem(ARTICLE_STORAGE_KEY);
  if (!articleText) return; // 학습 중인 기사가 없으면 위젯 자체를 띄우지 않는다

  const historyKey = ARTICLE_CHAT_HISTORY_PREFIX + hashArticleText(articleText);

  let messages = loadHistory();
  let isSending = false;

  const widget = buildWidget();
  document.body.appendChild(widget.root);
  // 페이지 하단 CTA 버튼(다음 포인트/퀴즈 풀러 가기 등)과 겹치지 않도록,
  // 위젯이 실제로 떠 있는 페이지에서만 .main에 여분의 하단 여백을 준다 (style.css 참고).
  document.body.classList.add("has-article-chat-widget");
  renderMessages();

  widget.fab.addEventListener("click", () => {
    const willOpen = !widget.panel.classList.contains("is-open");
    setOpen(willOpen);
  });

  widget.closeBtn.addEventListener("click", () => setOpen(false));

  widget.formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isSending) return;

    const text = widget.inputEl.value.trim();
    if (!text) return;

    widget.inputEl.value = "";
    messages.push({ role: "user", text });
    saveHistory();
    renderMessages();

    requestReply();
  });

  function hashArticleText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(historyKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    sessionStorage.setItem(historyKey, JSON.stringify(messages));
  }

  function setOpen(open) {
    widget.panel.classList.toggle("is-open", open);
    widget.fab.classList.toggle("is-open", open);
    widget.fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      scrollToBottom();
      widget.inputEl.focus();
    }
  }

  function scrollToBottom() {
    widget.messagesEl.scrollTop = widget.messagesEl.scrollHeight;
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
    widget.messagesEl.innerHTML = "";

    if (messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "chat-empty-state";
      empty.textContent = "지금 보고 있는 기사에 대해 궁금한 점을 물어보세요.";
      widget.messagesEl.appendChild(empty);
      return;
    }

    messages.forEach((msg) => {
      widget.messagesEl.appendChild(buildBubble(msg));
    });
    scrollToBottom();
  }

  function appendTypingIndicator() {
    const row = document.createElement("div");
    row.className = "chat-message chat-message-ai";
    row.id = "article-chat-typing-indicator";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bubble-ai chat-typing";
    bubble.innerHTML =
      '<span class="typing-dots"><span></span><span></span><span></span></span>답변을 생각하고 있어요...';

    row.appendChild(bubble);
    widget.messagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById("article-chat-typing-indicator");
    if (el) el.remove();
  }

  function appendErrorBubble(onRetry) {
    const row = document.createElement("div");
    row.className = "chat-message chat-message-ai";
    row.id = "article-chat-error-bubble";

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
    widget.messagesEl.appendChild(row);
    scrollToBottom();
  }

  function setSending(sending) {
    isSending = sending;
    widget.inputEl.disabled = sending;
    widget.sendBtn.disabled = sending;
  }

  async function requestReply(retryFn) {
    setSending(true);
    appendTypingIndicator();

    try {
      const reply = await fetchArticleChatReply(messages, articleText);
      removeTypingIndicator();
      messages.push({ role: "model", text: reply });
      saveHistory();
      renderMessages();
    } catch (err) {
      console.error("[article-chatbot] Gemini API 호출 실패:", err);
      removeTypingIndicator();
      appendErrorBubble(retryFn || (() => requestReply()));
    } finally {
      setSending(false);
    }
  }

  function buildWidget() {
    const root = document.createElement("div");
    root.className = "article-chat-widget";
    root.innerHTML = `
      <button type="button" class="article-chat-fab" id="article-chat-fab" aria-label="이 기사에 대해 질문하기" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="article-chat-fab-icon article-chat-fab-icon-chat">
          <path d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4.5 4V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="article-chat-fab-icon article-chat-fab-icon-close">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div class="article-chat-panel card" id="article-chat-panel">
        <div class="article-chat-panel-header">
          <div>
            <p class="article-chat-panel-title">이 기사에 대해 질문하기</p>
            <p class="article-chat-panel-subtitle">지금 보고 있는 기사를 바탕으로 답해드려요</p>
          </div>
          <button type="button" class="article-chat-close-btn" id="article-chat-close-btn" aria-label="닫기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div class="chatbot-messages article-chat-messages" id="article-chat-messages"></div>

        <form class="chatbot-input-row" id="article-chat-form">
          <input
            type="text"
            class="text-input chatbot-input"
            id="article-chat-input"
            placeholder="예: 이 기사에서 이 용어가 왜 중요한가요?"
            maxlength="500"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary btn-sm" id="article-chat-send-btn">전송</button>
        </form>
      </div>
    `;

    return {
      root,
      fab: root.querySelector("#article-chat-fab"),
      panel: root.querySelector("#article-chat-panel"),
      closeBtn: root.querySelector("#article-chat-close-btn"),
      messagesEl: root.querySelector("#article-chat-messages"),
      formEl: root.querySelector("#article-chat-form"),
      inputEl: root.querySelector("#article-chat-input"),
      sendBtn: root.querySelector("#article-chat-send-btn"),
    };
  }
});
