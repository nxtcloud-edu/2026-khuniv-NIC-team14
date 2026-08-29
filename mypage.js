// mypage.html — localStorage에 쌓인 학습 기록/통계를 렌더링

const WEEKLY_GOAL = 3;

document.addEventListener("DOMContentLoaded", () => {
  renderNickname();
  renderStats();
  renderRecentList();

  const resetBtn = document.getElementById("reset-history-btn");
  resetBtn.addEventListener("click", () => {
    const confirmed = confirm("학습 기록을 모두 초기화할까요? 이 작업은 되돌릴 수 없어요.");
    if (!confirmed) return;
    clearAllHistory();
    renderStats();
    renderRecentList();
  });
});

function renderNickname() {
  const nickname = getNickname() || "게스트";
  document.getElementById("sidebar-user-name").textContent = nickname;
  document.getElementById("mypage-title").textContent = `${nickname}님의 학습 기록이에요`;
}

function renderStats() {
  const stats = getStats();
  document.getElementById("stat-summaries").innerHTML = `${stats.totalSummaries}<span class="stat-unit">건</span>`;
  document.getElementById("stat-points").innerHTML = `${stats.totalPointsUnderstood}<span class="stat-unit">개</span>`;
  document.getElementById("stat-streak").innerHTML = `${stats.streakDays}<span class="stat-unit">일</span>`;
  renderWeeklyProgress(stats.weeklyCount);
}

function renderWeeklyProgress(weeklyCount) {
  document.getElementById("stat-weekly").textContent = `${weeklyCount} / ${WEEKLY_GOAL}`;

  const progressPercent = Math.min(weeklyCount / WEEKLY_GOAL, 1) * 100;
  document.getElementById("stat-weekly-progress-fill").style.width = `${progressPercent}%`;

  let message;
  if (weeklyCount < WEEKLY_GOAL) {
    message = `목표까지 ${WEEKLY_GOAL - weeklyCount}개 남았어요!`;
  } else if (weeklyCount === WEEKLY_GOAL) {
    message = "이번 주 목표를 달성했어요! 🎉";
  } else {
    message = "이번 주 목표를 넘었어요! 대단해요 🔥";
  }
  document.getElementById("stat-weekly-message").textContent = message;
}

function renderRecentList() {
  const container = document.getElementById("mypage-recent-list");
  const history = getHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        아직 학습 기록이 없어요<br />
        <a href="index.html" class="btn btn-primary">첫 기사 학습하러 가기</a>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((item) => formatHistoryItemHtml(item)).join("");
  attachHistoryListNavigation(container);
}
