// index.html — 기사 입력(직접 붙여넣기 또는 URL 자동 가져오기) & 학습 시작

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.querySelector(".textarea");
  const counter = document.getElementById("char-counter");
  const startBtn = document.getElementById("start-lesson-btn");
  const urlInput = document.getElementById("article-url-input");
  const fetchUrlBtn = document.getElementById("fetch-url-btn");
  const urlMessage = document.getElementById("url-fetch-message");
  const MAX_LENGTH = 10000;

  // 방금 URL에서 가져온 본문과 그 출처 URL. 사용자가 textarea를 직접 고치면
  // 더 이상 이 URL에서 나온 본문이라고 보기 어려우므로 연결을 끊는다.
  let fetchedText = "";
  let fetchedUrl = "";

  function updateCounter() {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString()} / ${MAX_LENGTH.toLocaleString()}자`;
  }

  function setUrlMessage(text, isError) {
    urlMessage.textContent = text || "";
    urlMessage.classList.toggle("visible", Boolean(text));
    urlMessage.style.color = isError ? "" : "var(--color-success)";
  }

  function setFetchingState(isFetching) {
    fetchUrlBtn.disabled = isFetching;
    fetchUrlBtn.textContent = isFetching ? "가져오는 중..." : "가져오기";
  }

  textarea.addEventListener("input", () => {
    updateCounter();
    if (textarea.value !== fetchedText) {
      fetchedUrl = "";
    }
  });
  updateCounter();

  fetchUrlBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      setUrlMessage("기사 URL을 입력해주세요.", true);
      urlInput.focus();
      return;
    }

    setFetchingState(true);
    setUrlMessage("", true);

    try {
      const result = await fetchArticleFromUrl(url);
      textarea.value = (result.text || "").slice(0, MAX_LENGTH);
      fetchedText = textarea.value;
      fetchedUrl = result.url || url;
      updateCounter();
      setUrlMessage(
        result.title ? `"${result.title}" 본문을 가져왔어요. 확인 후 학습을 시작해주세요.` : "본문을 가져왔어요. 확인 후 학습을 시작해주세요.",
        false
      );
    } catch (err) {
      console.error("[index] URL 크롤링 실패:", err);
      setUrlMessage(err.message || "기사를 가져오지 못했어요. 본문을 직접 붙여넣어 주세요.", true);
    } finally {
      setFetchingState(false);
    }
  });

  startBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) {
      alert("기사 본문을 입력해주세요.");
      textarea.focus();
      return;
    }
    endReviewMode();
    sessionStorage.setItem(ARTICLE_STORAGE_KEY, text);
    if (fetchedUrl && textarea.value === fetchedText) {
      sessionStorage.setItem(ARTICLE_URL_KEY, fetchedUrl);
    } else {
      sessionStorage.removeItem(ARTICLE_URL_KEY);
    }
    window.location.href = "lesson.html";
  });

  renderRecentList();
});

function renderRecentList() {
  const container = document.getElementById("recent-list");
  if (!container) return;

  const history = getHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        아직 학습한 뉴스가 없어요. 첫 기사를 붙여넣어보세요!
      </div>
    `;
    return;
  }

  container.innerHTML = history
    .slice(0, 5)
    .map((item) => formatHistoryItemHtml(item))
    .join("");
  attachHistoryListNavigation(container);
}
