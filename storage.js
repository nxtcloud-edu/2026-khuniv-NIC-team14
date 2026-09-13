// 뉴스레슨 — 학습 기록 & 통계 영구 저장 모듈 (Supabase Postgres)
// index.html, mypage.html, complete.html, lesson.html에서 공유해서 사용합니다.
// 이 파일보다 먼저 supabase-config.js(전역 supabaseClient)와 auth.js가 로드되어 있어야 합니다.
//
// 예전에는 localStorage(newsLessonHistory/newsLessonStats/newsLessonNickname)에
// 저장했지만, 로그인한 계정에 귀속시키기 위해 profiles/history_entries 테이블로
// 옮겼습니다 (테이블 정의는 supabase/migration.sql 참고). 통계는 별도 테이블 없이
// 매번 history_entries를 읽어 computeStats()로 즉석에서 계산합니다 — 예전에도
// STATS_STORAGE_KEY는 쓰기만 하고 읽지는 않아서, 사실상 항상 getHistory()로부터
// 파생된 값이었습니다.

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

// 현재 로그인한 사용자의 id. 로그인 세션이 없으면 null
// (auth.js의 페이지 가드를 통과했다면 보통 항상 값이 있다).
async function getCurrentUserId() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session ? data.session.user.id : null;
}

async function getNickname() {
  const userId = await getCurrentUserId();
  if (!userId) return "";

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "";
  return (data.nickname || "").trim();
}

// history_entries 테이블의 snake_case 컬럼을 앱 전역에서 쓰던 camelCase entry 모양으로 되돌린다.
function mapHistoryRow(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    pointsCount: row.points_count,
    quizScore: row.quiz_score,
    summary: row.summary,
    tags: row.tags || [],
    articleText: row.article_text,
    articleTitle: row.article_title,
    url: row.url,
    points: row.points || [],
    overview: row.overview || "",
    quiz: row.quiz || [],
  };
}

async function getHistory() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabaseClient
    .from("history_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[storage] 학습 기록을 불러오지 못했습니다:", error.message);
    return [];
  }
  return (data || []).map(mapHistoryRow);
}

async function getHistoryItemById(id) {
  if (!id) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabaseClient
    .from("history_entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapHistoryRow(data);
}

// review 모드로 학습 완료 시 새 기록을 추가하는 대신 기존 기록을 갱신한다
// (통계가 중복으로 늘어나지 않도록).
async function updateHistoryEntry(id, patch) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const dbPatch = {};
  if ("summary" in patch) dbPatch.summary = patch.summary;
  if ("quizScore" in patch) dbPatch.quiz_score = patch.quizScore;
  if ("points" in patch) dbPatch.points = patch.points;
  if ("overview" in patch) dbPatch.overview = patch.overview;
  if ("quiz" in patch) dbPatch.quiz = patch.quiz;

  const { data, error } = await supabaseClient
    .from("history_entries")
    .update(dbPatch)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error("[storage] 학습 기록 갱신 실패:", error && error.message);
    return null;
  }
  return mapHistoryRow(data);
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

async function getStats() {
  return computeStats(await getHistory());
}

async function addHistoryEntry(entry) {
  const userId = await getCurrentUserId();
  if (!userId) return computeStats([]);

  const { error } = await supabaseClient.from("history_entries").insert({
    user_id: userId,
    title: entry.title,
    date: entry.date,
    points_count: entry.pointsCount,
    quiz_score: entry.quizScore,
    summary: entry.summary,
    tags: entry.tags,
    article_text: entry.articleText,
    article_title: entry.articleTitle,
    url: entry.url,
    points: entry.points,
    overview: entry.overview,
    quiz: entry.quiz,
  });

  if (error) {
    console.error("[storage] 학습 기록 저장 실패:", error.message);
  }
  return await getStats();
}

async function clearAllHistory() {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabaseClient.from("history_entries").delete().eq("user_id", userId);
  if (error) {
    console.error("[storage] 학습 기록 초기화 실패:", error.message);
  }
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
