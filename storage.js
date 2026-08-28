// 뉴스레슨 — 학습 기록 & 통계 영구 저장 모듈 (localStorage)
// index.html, mypage.html, complete.html에서 공유해서 사용합니다.
// 브라우저를 껐다 켜도 유지되어야 하는 데이터만 여기서 다룬다.

const HISTORY_STORAGE_KEY = "newsLessonHistory";
const STATS_STORAGE_KEY = "newsLessonStats";
const NICKNAME_STORAGE_KEY = "newsLessonNickname";

function getNickname() {
  return (localStorage.getItem(NICKNAME_STORAGE_KEY) || "").trim();
}

function setNickname(nickname) {
  localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function computeStreakDays(dateStrings) {
  const uniqueDatesDesc = [...new Set(dateStrings)].sort().reverse();
  if (uniqueDatesDesc.length === 0) return 0;

  let streak = 1;
  for (let i = 0; i < uniqueDatesDesc.length - 1; i++) {
    const current = new Date(uniqueDatesDesc[i]);
    const previous = new Date(uniqueDatesDesc[i + 1]);
    const diffDays = Math.round((current - previous) / 86400000);
    if (diffDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function computeWeeklyCount(history) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  return history.filter((item) => new Date(item.date) >= weekAgo).length;
}

function computeStats(history) {
  const totalSummaries = history.filter(
    (item) => (item.summary || "").trim().length > 0
  ).length;
  const totalPointsUnderstood = history.reduce(
    (sum, item) => sum + (item.pointsCount || 0),
    0
  );
  const weeklyCount = computeWeeklyCount(history);
  const streakDays = computeStreakDays(history.map((item) => item.date));

  return { totalSummaries, totalPointsUnderstood, weeklyCount, streakDays };
}

function getStats() {
  return computeStats(getHistory());
}

function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry);
  saveHistory(history);

  const stats = computeStats(history);
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

function clearAllHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
  localStorage.removeItem(STATS_STORAGE_KEY);
}

function escapeHtmlText(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

function formatHistoryItemHtml(item) {
  const tags = (item.tags || [])
    .map((tag) => `<span class="tag">${escapeHtmlText(tag)}</span>`)
    .join("");
  const dateLabel = (item.date || "").replaceAll("-", ".");
  const noteBlock = item.summary
    ? `<details>
         <summary></summary>
         <div class="note-box">${escapeHtmlText(item.summary)}</div>
       </details>`
    : "";

  return `
    <div class="list-item">
      <div class="list-item-top">
        <div>
          <p class="list-item-title">${escapeHtmlText(item.title || "제목 없음")}</p>
          <div class="list-item-tags">${tags}</div>
        </div>
        <span class="list-item-date">${dateLabel}</span>
      </div>
      ${noteBlock}
    </div>
  `;
}
