// quiz.html — lesson.html에서 만든 핵심 포인트로 Gemini에 OX 퀴즈를 생성 요청하고 채점함

document.addEventListener("DOMContentLoaded", () => {
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const errorMessage = document.getElementById("error-message");
  const retryBtn = document.getElementById("retry-btn");
  const quizContent = document.getElementById("quiz-content");
  const quizList = document.getElementById("quiz-list");
  const scoreBanner = document.getElementById("score-banner");
  const scoreText = document.getElementById("score-text");
  const revealArea = document.getElementById("reveal-area");
  const revealBtn = document.getElementById("reveal-btn");
  const revealHint = document.getElementById("reveal-hint");
  const nextArea = document.getElementById("next-area");
  const nextBtn = document.getElementById("next-btn");
  const reviewBadge = document.getElementById("review-badge");

  if (isReviewMode() && reviewBadge) {
    reviewBadge.style.display = "inline-flex";
  }

  let questions = [];
  let userAnswers = [];
  let revealed = false;

  function showState(state) {
    loadingState.style.display = state === "loading" ? "flex" : "none";
    errorState.style.display = state === "error" ? "block" : "none";
    quizContent.style.display = state === "content" ? "block" : "none";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function renderQuiz() {
    revealed = false;
    scoreBanner.style.display = "none";
    nextArea.style.display = "none";
    revealArea.style.display = "block";

    quizList.innerHTML = questions
      .map(
        (q, index) => `
        <section class="card quiz-card" data-index="${index}">
          <div class="quiz-card-head">
            <span class="quiz-card-badge">Q${index + 1}</span>
            ${q.relatedPoint ? `<span class="quiz-related-point">${escapeHtml(q.relatedPoint)}</span>` : ""}
          </div>
          <p class="quiz-question-text">${escapeHtml(q.question || "")}</p>
          <div class="quiz-options">
            <button type="button" class="quiz-option-btn" data-value="true">O</button>
            <button type="button" class="quiz-option-btn" data-value="false">X</button>
          </div>
          <div class="quiz-result" style="display: none;">
            <span class="quiz-result-badge"></span>
            <p class="quiz-explanation"></p>
          </div>
        </section>
      `
      )
      .join("");

    userAnswers = new Array(questions.length).fill(null);
    updateRevealState();
  }

  function handleOptionClick(event) {
    if (revealed) return;
    const btn = event.target.closest(".quiz-option-btn");
    if (!btn) return;
    const card = btn.closest(".quiz-card");
    const index = Number(card.dataset.index);

    userAnswers[index] = btn.dataset.value === "true";
    card.querySelectorAll(".quiz-option-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    updateRevealState();
  }

  function updateRevealState() {
    const allAnswered = userAnswers.length > 0 && userAnswers.every((a) => a !== null);
    revealBtn.disabled = !allAnswered;
    revealHint.style.display = allAnswered ? "none" : "block";
  }

  quizList.addEventListener("click", handleOptionClick);

  revealBtn.addEventListener("click", () => {
    revealed = true;
    let correctCount = 0;

    questions.forEach((q, index) => {
      const card = quizList.children[index];
      const isCorrect = userAnswers[index] === q.answer;
      if (isCorrect) correctCount += 1;

      const resultEl = card.querySelector(".quiz-result");
      const badge = resultEl.querySelector(".quiz-result-badge");
      const explanation = resultEl.querySelector(".quiz-explanation");

      badge.textContent = isCorrect ? "정답" : "오답";
      badge.classList.toggle("correct", isCorrect);
      badge.classList.toggle("incorrect", !isCorrect);
      explanation.textContent = q.explanation || "";
      resultEl.style.display = "block";

      card.querySelectorAll(".quiz-option-btn").forEach((b) => {
        b.disabled = true;
        if ((b.dataset.value === "true") === q.answer) {
          b.classList.add("correct-answer");
        }
      });
    });

    scoreText.textContent = `${questions.length}문제 중 ${correctCount}개 정답!`;
    scoreBanner.style.display = "block";
    revealArea.style.display = "none";
    nextArea.style.display = "flex";

    sessionStorage.setItem(
      QUIZ_RESULT_KEY,
      JSON.stringify({ correct: correctCount, total: questions.length })
    );
  });

  nextBtn.addEventListener("click", () => {
    window.location.href = "summary.html";
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

  function readCachedQuiz(articleText, expectedCount) {
    const cachedFor = sessionStorage.getItem(QUIZ_DATA_FOR_KEY);
    if (cachedFor !== articleText) return null;
    const cached = sessionStorage.getItem(QUIZ_DATA_KEY);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) && parsed.length === expectedCount ? parsed : null;
    } catch {
      return null;
    }
  }

  function cacheQuiz(articleText, fetchedQuestions) {
    sessionStorage.setItem(QUIZ_DATA_FOR_KEY, articleText);
    sessionStorage.setItem(QUIZ_DATA_KEY, JSON.stringify(fetchedQuestions));
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
        "퀴즈를 만들려면 핵심 포인트 학습을 먼저 완료해주세요."
      );
      return;
    }

    const points = lessonData.points;

    const cachedQuiz = readCachedQuiz(articleText, points.length);
    if (cachedQuiz) {
      questions = cachedQuiz;
      showState("content");
      renderQuiz();
      return;
    }

    if (isReviewMode()) {
      goToWithMessage(
        "mypage.html",
        "마이페이지로 가기",
        "이 기록에는 저장된 퀴즈가 없어요."
      );
      return;
    }

    showState("loading");

    try {
      const fetchedQuestions = await fetchQuizQuestions(articleText, points);
      cacheQuiz(articleText, fetchedQuestions);
      questions = fetchedQuestions;
      showState("content");
      renderQuiz();
    } catch (err) {
      console.error("[quiz] Gemini API 호출 실패:", err);
      showState("error");
      errorMessage.textContent = "퀴즈를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";
      retryBtn.textContent = "다시 시도";
      retryBtn.onclick = loadAndRender;
    }
  }

  loadAndRender();
});
