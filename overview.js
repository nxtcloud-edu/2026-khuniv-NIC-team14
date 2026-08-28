// overview.html — lesson.html에서 학습한 핵심 개념을 바탕으로 기사 전체 흐름을 3문단으로 재정리

document.addEventListener("DOMContentLoaded", () => {
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const errorMessage = document.getElementById("error-message");
  const retryBtn = document.getElementById("retry-btn");
  const overviewCard = document.getElementById("overview-card");
  const overviewText = document.getElementById("overview-text");
  const overviewDisclaimer = document.getElementById("overview-disclaimer");
  const overviewActions = document.getElementById("overview-actions");
  const nextBtn = document.getElementById("next-btn");

  function showState(state) {
    loadingState.style.display = state === "loading" ? "flex" : "none";
    errorState.style.display = state === "error" ? "block" : "none";
    overviewCard.style.display = state === "content" ? "block" : "none";
    overviewDisclaimer.style.display = state === "content" ? "block" : "none";
    overviewActions.style.display = state === "content" ? "flex" : "none";
  }

  function renderOverview(overview) {
    overviewText.innerHTML = "";
    overview
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((paragraph) => {
        const p = document.createElement("p");
        p.className = "overview-paragraph";
        p.textContent = paragraph;
        overviewText.appendChild(p);
      });
  }

  nextBtn.addEventListener("click", () => {
    window.location.href = "quiz.html";
  });

  retryBtn.addEventListener("click", () => {
    loadAndRender();
  });

  function readLessonData(articleText) {
    const cachedFor = sessionStorage.getItem(LESSON_POINTS_FOR_KEY);
    if (cachedFor !== articleText) return null;
    const cached = sessionStorage.getItem(LESSON_POINTS_KEY);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed.points) && parsed.points.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  function readCachedOverview(articleText) {
    const cachedFor = sessionStorage.getItem(OVERVIEW_DATA_FOR_KEY);
    if (cachedFor !== articleText) return null;
    const cached = sessionStorage.getItem(OVERVIEW_DATA_KEY);
    return cached || null;
  }

  function cacheOverview(articleText, overview) {
    sessionStorage.setItem(OVERVIEW_DATA_FOR_KEY, articleText);
    sessionStorage.setItem(OVERVIEW_DATA_KEY, overview);
  }

  function goToWithMessage(target, buttonLabel, message) {
    showState("error");
    errorMessage.textContent = message;
    retryBtn.textContent = buttonLabel;
    retryBtn.onclick = () => {
      window.location.href = target;
    };
  }

  async function loadAndRender() {
    const articleText = sessionStorage.getItem(ARTICLE_STORAGE_KEY);

    if (!articleText) {
      goToWithMessage(
        "index.html",
        "홈으로 가기",
        "학습할 기사가 없어요. 홈에서 먼저 기사 본문을 입력해주세요."
      );
      return;
    }

    const lessonData = readLessonData(articleText);
    if (!lessonData) {
      goToWithMessage(
        "lesson.html",
        "핵심 포인트 학습하러 가기",
        "기사를 다시 살펴보려면 핵심 포인트 학습을 먼저 완료해주세요."
      );
      return;
    }

    const cachedOverview = readCachedOverview(articleText);
    if (cachedOverview) {
      renderOverview(cachedOverview);
      showState("content");
      return;
    }

    showState("loading");

    try {
      const overview = await fetchOverviewSummary(articleText, lessonData.points);
      cacheOverview(articleText, overview);
      renderOverview(overview);
      showState("content");
    } catch (err) {
      console.error("[overview] Gemini API 호출 실패:", err);
      showState("error");
      errorMessage.textContent = "기사 요약을 불러오지 못했어요. 잠시 후 다시 시도해주세요.";
      retryBtn.textContent = "다시 시도";
      retryBtn.onclick = loadAndRender;
    }
  }

  loadAndRender();
});
