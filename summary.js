// summary.html — 내 말로 정리하기 (임시 데이터는 sessionStorage에 보관)

document.addEventListener("DOMContentLoaded", () => {
  const eyebrow = document.getElementById("page-eyebrow");
  const textarea = document.getElementById("summary-textarea");
  const charCount = document.getElementById("summary-char-count");
  const chipRow = document.getElementById("chip-row");
  const prevBtn = document.getElementById("prev-btn");
  const finishBtn = document.getElementById("finish-btn");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  const articleTitle = sessionStorage.getItem(ARTICLE_TITLE_KEY);
  if (articleTitle) {
    eyebrow.textContent = articleTitle;
  }

  const savedSummary = sessionStorage.getItem(SUMMARY_TEXT_KEY);
  if (savedSummary) {
    textarea.value = savedSummary;
  }

  function updateCharCount() {
    charCount.textContent = `${textarea.value.length}자 작성됨`;
  }
  textarea.addEventListener("input", updateCharCount);
  updateCharCount();

  const articleText = sessionStorage.getItem(ARTICLE_STORAGE_KEY);
  if (articleText && sessionStorage.getItem(LESSON_POINTS_FOR_KEY) === articleText) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(LESSON_POINTS_KEY));
      const points = parsed && Array.isArray(parsed.points) ? parsed.points : [];
      if (points.length > 0) {
        chipRow.innerHTML = points
          .map(
            (p) => `<span class="chip"><span class="chip-dot"></span>${escapeHtml(p.title || "")}</span>`
          )
          .join("");
      }
    } catch {
      // 캐시가 손상된 경우 기본 chip을 그대로 둔다.
    }
  }

  prevBtn.addEventListener("click", () => {
    sessionStorage.setItem(SUMMARY_TEXT_KEY, textarea.value);
    window.location.href = "quiz.html";
  });

  finishBtn.addEventListener("click", () => {
    sessionStorage.setItem(SUMMARY_TEXT_KEY, textarea.value);
    window.location.href = "complete.html";
  });
});
