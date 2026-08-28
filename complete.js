// complete.html — 학습 완료 시점에 임시(sessionStorage) 데이터를 영구(localStorage) 기록으로 저장

document.addEventListener("DOMContentLoaded", () => {
  const eyebrow = document.getElementById("celebrate-eyebrow");
  const subtitle = document.getElementById("celebrate-subtitle");
  const streakBadge = document.getElementById("streak-badge");

  const HISTORY_COMMITTED_FOR_KEY = "nl_history_committed_for";

  const articleText = sessionStorage.getItem(ARTICLE_STORAGE_KEY);
  const articleTitle = sessionStorage.getItem(ARTICLE_TITLE_KEY) || "";
  const summaryText = sessionStorage.getItem(SUMMARY_TEXT_KEY) || "";

  let pointsCount = 0;
  let pointTitles = [];
  if (articleText && sessionStorage.getItem(LESSON_POINTS_FOR_KEY) === articleText) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(LESSON_POINTS_KEY));
      const points = parsed && Array.isArray(parsed.points) ? parsed.points : [];
      pointsCount = points.length;
      pointTitles = points.map((p) => p.title).filter(Boolean);
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
    addHistoryEntry({
      id: `${Date.now()}`,
      title: articleTitle || articleText.slice(0, 30),
      date: new Date().toISOString().slice(0, 10),
      pointsCount,
      quizScore: quizResult,
      summary: summaryText,
      tags: pointTitles.slice(0, 3),
    });
    sessionStorage.setItem(HISTORY_COMMITTED_FOR_KEY, articleText);
  }

  const stats = getStats();
  if (stats.streakDays > 0) {
    streakBadge.textContent = `🔥 연속 학습 ${stats.streakDays}일째`;
    streakBadge.style.display = "inline-flex";
  }
});
