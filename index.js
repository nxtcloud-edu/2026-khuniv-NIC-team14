// index.html — 기사 입력 & 학습 시작

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.querySelector(".textarea");
  const counter = document.getElementById("char-counter");
  const startBtn = document.getElementById("start-lesson-btn");
  const MAX_LENGTH = 10000;

  function updateCounter() {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString()} / ${MAX_LENGTH.toLocaleString()}자`;
  }

  textarea.addEventListener("input", updateCounter);
  updateCounter();

  startBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) {
      alert("기사 본문을 입력해주세요.");
      textarea.focus();
      return;
    }
    endReviewMode();
    sessionStorage.setItem(ARTICLE_STORAGE_KEY, text);
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
