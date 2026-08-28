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
    sessionStorage.setItem(ARTICLE_STORAGE_KEY, text);
    window.location.href = "lesson.html";
  });
});
