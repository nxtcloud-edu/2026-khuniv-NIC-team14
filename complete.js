// complete.html — 학습 완료 시점에 임시(sessionStorage) 데이터를 영구(localStorage) 기록으로 저장

document.addEventListener("DOMContentLoaded", () => {
  const eyebrow = document.getElementById("celebrate-eyebrow");
  const subtitle = document.getElementById("celebrate-subtitle");
  const streakBadge = document.getElementById("streak-badge");
  const reviewBadge = document.getElementById("review-badge");

  const HISTORY_COMMITTED_FOR_KEY = "nl_history_committed_for";

  const reviewMode = isReviewMode();
  const reviewId = getReviewId();

  if (reviewMode && reviewBadge) {
    reviewBadge.style.display = "inline-flex";
  }

  const articleText = sessionStorage.getItem(ARTICLE_STORAGE_KEY);
  const articleTitle = sessionStorage.getItem(ARTICLE_TITLE_KEY) || "";
  const articleUrl = sessionStorage.getItem(ARTICLE_URL_KEY) || "";
  const summaryText = sessionStorage.getItem(SUMMARY_TEXT_KEY) || "";

  let points = [];
  if (articleText && sessionStorage.getItem(LESSON_POINTS_FOR_KEY) === articleText) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(LESSON_POINTS_KEY));
      points = parsed && Array.isArray(parsed.points) ? parsed.points : [];
    } catch {
      // 캐시가 손상된 경우 무시
    }
  }
  const pointsCount = points.length;
  const pointTitles = points.map((p) => p.title).filter(Boolean);

  let overviewText = "";
  if (articleText && sessionStorage.getItem(OVERVIEW_DATA_FOR_KEY) === articleText) {
    overviewText = sessionStorage.getItem(OVERVIEW_DATA_KEY) || "";
  }

  let quizQuestions = [];
  if (articleText && sessionStorage.getItem(QUIZ_DATA_FOR_KEY) === articleText) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(QUIZ_DATA_KEY));
      quizQuestions = Array.isArray(parsed) ? parsed : [];
    } catch {
      // 캐시가 손상된 경우 무시
    }
  }

  let quizResult = null;
  try {
    quizResult = JSON.parse(sessionStorage.getItem(QUIZ_RESULT_KEY) || "null");
  } catch {
    quizResult = null;
  }

  if (articleTitle) {
    eyebrow.textContent = articleTitle;
  }

  if (quizResult && typeof quizResult.correct === "number" && typeof quizResult.total === "number") {
    subtitle.textContent = `OX 퀴즈 ${quizResult.total}문제 중 ${quizResult.correct}개 정답! 핵심 포인트 학습부터 정리까지 모두 마쳤어요.`;
  }

  const alreadyCommitted =
    articleText && sessionStorage.getItem(HISTORY_COMMITTED_FOR_KEY) === articleText;

  if (articleText && pointsCount > 0 && !alreadyCommitted) {
    if (reviewMode && reviewId) {
      // 다시보기 완료 시에는 새 기록을 추가하지 않고 기존 기록만 갱신한다
      // (통계가 중복으로 늘어나지 않도록).
      updateHistoryEntry(reviewId, {
        summary: summaryText,
        quizScore: quizResult,
        points,
        overview: overviewText,
        quiz: quizQuestions,
      });
      endReviewMode();
    } else {
      addHistoryEntry({
        id: `${Date.now()}`,
        title: articleTitle || articleText.slice(0, 30),
        date: new Date().toISOString().slice(0, 10),
        pointsCount,
        quizScore: quizResult,
        summary: summaryText,
        tags: pointTitles.slice(0, 3),
        articleText,
        articleTitle,
        url: articleUrl,
        points,
        overview: overviewText,
        quiz: quizQuestions,
      });
    }
    sessionStorage.setItem(HISTORY_COMMITTED_FOR_KEY, articleText);
  }

  const stats = getStats();
  if (stats.streakDays > 0) {
    streakBadge.textContent = `🔥 연속 학습 ${stats.streakDays}일째`;
    streakBadge.style.display = "inline-flex";
  }
});
