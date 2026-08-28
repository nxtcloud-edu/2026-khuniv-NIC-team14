// lesson.html — 저장된 기사로 Gemini API를 호출하고 핵심 포인트를 카드로 보여줌

const POINTS_CACHE_KEY = "nl_lesson_points";
const POINTS_CACHE_FOR_KEY = "nl_lesson_points_for";

document.addEventListener("DOMContentLoaded", () => {
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const errorMessage = document.getElementById("error-message");
  const retryBtn = document.getElementById("retry-btn");
  const lessonCard = document.getElementById("lesson-card");
  const progressHeader = document.getElementById("progress-header");
  const progressTrack = document.getElementById("progress-track");

  const progressCount = document.getElementById("progress-count");
  const progressFill = document.getElementById("progress-fill");
  const pointTopic = document.getElementById("point-topic");
  const stepDefinition = document.getElementById("step-definition");
  const stepEasy = document.getElementById("step-easy");
  const stepContext = document.getElementById("step-context");
  const stepImpactList = document.getElementById("step-impact-list");

  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  let points = [];
  let currentIndex = 0;

  function showState(state) {
    loadingState.style.display = state === "loading" ? "flex" : "none";
    errorState.style.display = state === "error" ? "block" : "none";
    lessonCard.style.display = state === "content" ? "block" : "none";
    progressHeader.style.display = state === "content" ? "flex" : "none";
    progressTrack.style.display = state === "content" ? "block" : "none";
  }

  function renderPoint() {
    const total = points.length;
    const point = points[currentIndex];

    progressCount.textContent = `${currentIndex + 1} / ${total}`;
    progressFill.style.width = `${((currentIndex + 1) / total) * 100}%`;

    pointTopic.textContent = point.title || "";
    stepDefinition.textContent = point.definition || "";
    stepEasy.textContent = point.easy || "";
    stepContext.textContent = point.context || "";

    stepImpactList.innerHTML = "";
    const impacts = Array.isArray(point.impact) ? point.impact : [point.impact].filter(Boolean);
    impacts.forEach((impact) => {
      const li = document.createElement("li");
      li.textContent = impact;
      stepImpactList.appendChild(li);
    });

    prevBtn.textContent = currentIndex === 0 ? "이전으로" : "이전 포인트";
    nextBtn.textContent = currentIndex === total - 1 ? "정리하러 가기" : "다음 포인트";
  }

  prevBtn.addEventListener("click", () => {
    if (currentIndex === 0) {
      window.location.href = "index.html";
      return;
    }
    currentIndex -= 1;
    renderPoint();
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex === points.length - 1) {
      window.location.href = "summary.html";
      return;
    }
    currentIndex += 1;
    renderPoint();
  });

  retryBtn.addEventListener("click", () => {
    loadAndRender();
  });

  function readCachedPoints(articleText) {
    const cachedFor = sessionStorage.getItem(POINTS_CACHE_FOR_KEY);
    if (cachedFor !== articleText) return null;
    const cached = sessionStorage.getItem(POINTS_CACHE_KEY);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  function cachePoints(articleText, fetchedPoints) {
    sessionStorage.setItem(POINTS_CACHE_FOR_KEY, articleText);
    sessionStorage.setItem(POINTS_CACHE_KEY, JSON.stringify(fetchedPoints));
  }

  async function loadAndRender() {
    const articleText = sessionStorage.getItem(ARTICLE_STORAGE_KEY);

    if (!articleText) {
      showState("error");
      errorMessage.textContent = "학습할 기사가 없어요. 홈에서 먼저 기사 본문을 입력해주세요.";
      retryBtn.textContent = "홈으로 가기";
      retryBtn.onclick = () => {
        window.location.href = "index.html";
      };
      return;
    }

    const cached = readCachedPoints(articleText);
    if (cached) {
      points = cached;
      currentIndex = 0;
      showState("content");
      renderPoint();
      return;
    }

    showState("loading");

    try {
      const fetchedPoints = await fetchLessonPoints(articleText);
      cachePoints(articleText, fetchedPoints);
      points = fetchedPoints;
      currentIndex = 0;
      showState("content");
      renderPoint();
    } catch (err) {
      console.error("[lesson] Gemini API 호출 실패:", err);
      showState("error");
      errorMessage.textContent = "핵심 포인트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";
      retryBtn.textContent = "다시 시도";
      retryBtn.onclick = loadAndRender;
    }
  }

  loadAndRender();
});
