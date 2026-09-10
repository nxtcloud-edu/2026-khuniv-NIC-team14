// 뉴스레슨 — 학습 기록 & 통계 영구 저장 모듈 (localStorage)
// index.html, mypage.html, complete.html에서 공유해서 사용합니다.
// 브라우저를 껐다 켜도 유지되어야 하는 데이터만 여기서 다룬다.

const HISTORY_STORAGE_KEY = "newsLessonHistory";
const STATS_STORAGE_KEY = "newsLessonStats";
const NICKNAME_STORAGE_KEY = "newsLessonNickname";

// ---------------------------------------------------------------------------
// "최근 학습 다시보기" 모드 — sessionStorage 플래그.
// true인 동안 lesson/overview/quiz.html은 Gemini를 다시 호출하지 않고
// newsLessonHistory에 저장된 기록 데이터를 그대로 재사용한다.
// ---------------------------------------------------------------------------
const REVIEW_MODE_KEY = "nl_review_mode";
const REVIEW_ID_KEY = "nl_review_id";

function isReviewMode() {
  return sessionStorage.getItem(REVIEW_MODE_KEY) === "true";
}

function getReviewId() {
  return sessionStorage.getItem(REVIEW_ID_KEY) || "";
}

function startReviewMode(id) {
  sessionStorage.setItem(REVIEW_MODE_KEY, "true");
  sessionStorage.setItem(REVIEW_ID_KEY, id);
}

function endReviewMode() {
  sessionStorage.removeItem(REVIEW_MODE_KEY);
  sessionStorage.removeItem(REVIEW_ID_KEY);
}

function getNickname() {
  return (localStorage.getItem(NICKNAME_STORAGE_KEY) || "").trim();
}

function setNickname(nickname) {
  localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return ensureHistoryIds(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

// 이 기능 이전에 저장된 기록에는 id가 없을 수 있으므로, 없으면 채워 넣고
// 즉시 영구 저장한다. "다시보기" 클릭 시 기록을 식별하는 데 id가 필요하다.
function ensureHistoryIds(history) {
  let changed = false;
  history.forEach((item, index) => {
    if (!item.id) {
      item.id = `legacy-${Date.now()}-${index}`;
      changed = true;
    }
  });
  if (changed) saveHistory(history);
  return history;
}

function getHistoryItemById(id) {
  if (!id) return null;
  return getHistory().find((item) => item.id === id) || null;
}

// review 모드로 학습 완료 시 새 기록을 추가하는 대신 기존 기록을 갱신한다
// (통계가 중복으로 늘어나지 않도록).
function updateHistoryEntry(id, patch) {
  const history = getHistory();
  const index = history.findIndex((item) => item.id === id);
  if (index === -1) return null;

  history[index] = { ...history[index], ...patch };
  saveHistory(history);

  const stats = computeStats(history);
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  return history[index];
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
  const titleText = escapeHtmlText(item.title || "제목 없음");
  const historyId = escapeHtmlText(item.id || "");
  const sourceUrl = typeof item.url === "string" ? item.url.trim() : "";
  // 원문 링크는 새 탭으로 열리는 별도 <a> 태그라 카드 자체의 "다시보기" 클릭과
  // 겹치지 않도록 stopPropagation으로 분리한다.
  const sourceLink = sourceUrl
    ? `<a
         class="list-item-source-link"
         href="${escapeHtmlText(sourceUrl)}"
         target="_blank"
         rel="noopener noreferrer"
         onclick="event.stopPropagation()"
       >원문 보기 ↗</a>`
    : "";

  return `
    <div
      class="list-item list-item-clickable"
      data-history-id="${historyId}"
      role="button"
      tabindex="0"
      aria-label="${titleText} 다시보기"
    >
      <div class="list-item-top">
        <div>
          <p class="list-item-title">${titleText}</p>
          <div class="list-item-tags">${tags}</div>
        </div>
        <span class="list-item-date">${dateLabel}</span>
      </div>
      ${sourceLink}
      ${noteBlock}
    </div>
  `;
}

// 기록 목록(recent-list / mypage-recent-list) 클릭 시 해당 기록을
// "다시보기" 모드로 lesson.html부터 다시 훑을 수 있게 한다.
function goToReview(id) {
  if (!id) return;
  startReviewMode(id);
  window.location.href = "lesson.html";
}

function attachHistoryListNavigation(container) {
  if (!container || container.dataset.reviewNavBound) return;
  container.dataset.reviewNavBound = "true";

  container.addEventListener("click", (event) => {
    if (event.target.closest("details")) return;
    const item = event.target.closest(".list-item[data-history-id]");
    if (!item) return;
    goToReview(item.dataset.historyId);
  });

  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("details")) return;
    const item = event.target.closest(".list-item[data-history-id]");
    if (!item) return;
    event.preventDefault();
    goToReview(item.dataset.historyId);
  });
}
