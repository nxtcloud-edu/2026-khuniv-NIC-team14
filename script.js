// 뉴스레슨 — Gemini API 연동 공통 모듈
// index.html, lesson.html, quiz.html, summary.html, complete.html에서 공유해서 사용합니다.

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL +
  ":generateContent";

// ---------------------------------------------------------------------------
// sessionStorage 키 — "지금 학습 중인 기사" 흐름 전용 임시 데이터.
// 학습이 끝나고 새로 시작하면 사라져도 되는 값들이라 sessionStorage에 둔다.
// (영구 기록은 storage.js의 localStorage 키(newsLessonHistory 등)를 사용)
// ---------------------------------------------------------------------------
const ARTICLE_STORAGE_KEY = "nl_article_text";
const ARTICLE_TITLE_KEY = "nl_article_title";
const LESSON_POINTS_KEY = "nl_lesson_points";
const LESSON_POINTS_FOR_KEY = "nl_lesson_points_for";
const OVERVIEW_DATA_KEY = "nl_overview_data";
const OVERVIEW_DATA_FOR_KEY = "nl_overview_data_for";
const QUIZ_DATA_KEY = "nl_quiz_data";
const QUIZ_DATA_FOR_KEY = "nl_quiz_data_for";
const QUIZ_RESULT_KEY = "nl_quiz_result";
const SUMMARY_TEXT_KEY = "nl_summary_text";

function buildLessonPrompt(articleText) {
  return `당신은 경제 뉴스 학습을 도와주는 AI 튜터입니다.
아래 기사를 읽고, 이 기사를 이해하는 데 꼭 필요한 핵심 개념이나 현상을 1개에서 3개 사이로 선정하세요.

각 포인트는 다음 4단계로 설명하세요:
1. definition: 개념의 기본적/사전적 정의를 한 문장으로 간결하게 작성하세요.
2. easy: definition과는 다르게, 초등학생도 이해할 수 있을 정도로 아주 쉽게 풀어서 설명하세요. 전공 용어나 어려운 한자어는 쓰지 말고, 일상 속 비유나 예시를 적극 활용하세요. 문장은 짧고 간단하게 한두 문장으로 써주세요.
3. context: 이 개념이 이 기사에서 구체적으로 어떻게 나타나는지 (기사 내용과 직접 연결)
4. impact: 이 개념/현상이 만드는 경제적 영향을 1~2개 항목으로 설명

선정 기준:
- 기사를 이해하는 데 "꼭" 필요한 것만 고르세요 (전체 요약이 아님)
- 이미 누구나 아는 상식적인 용어는 제외하세요
- 최대 3개, 최소 1개

articleTitle: 기사 본문의 핵심 내용을 압축한 제목을 15자 내외로 작성하세요. 기사에 이미 제목이 포함되어 있다면 그것을 다듬어 쓰고, 없다면 본문 내용으로 추론해서 작성하세요.

출력은 반드시 아래 JSON 형식으로만 출력하세요. 다른 설명이나 markdown 코드블록 표시 없이 순수 JSON만 출력하세요.

{
  "articleTitle": "기사 내용을 압축한 제목 (15자 내외, 사용자가 원문에 제목을 안 줬을 수 있으니 본문에서 추론)",
  "points": [
    {
      "title": "개념/현상 이름",
      "definition": "개념의 기본 정의를 한 줄로 (사전적/공식적 정의, 간결하게)",
      "easy": "초등학생도 이해할 수 있을 정도로 아주 쉽게 설명하세요. 전공 용어나 어려운 한자어는 절대 쓰지 마세요. 일상 속 비유나 예시를 적극 활용하세요 (예: 용돈, 가게, 친구 사이 일 등). 문장은 짧고 간단하게, 한두 문장으로.",
      "context": "기사 속 맥락",
      "impact": ["영향 1", "영향 2"]
    }
  ]
}

기사 본문:
"""
${articleText}
"""`;
}

function buildQuizPrompt(articleText, points) {
  const pointCount = points.length;
  const pointsData = JSON.stringify(
    points.map((p) => ({
      title: p.title,
      definition: p.definition,
      easy: p.easy,
      context: p.context,
      impact: p.impact,
    })),
    null,
    2
  );

  return `당신은 경제 뉴스 학습을 도와주는 AI 튜터입니다.
아래는 사용자가 학습한 기사와 핵심 개념 목록입니다.
각 핵심 개념마다 OX 문제를 하나씩 만들어, 총 ${pointCount}개의 OX 문제를 만드세요.
각 문제는 해당 개념에 대한 이해를 확인하는 참/거짓 판단 문장이어야 합니다.

출력은 반드시 아래 JSON 형식으로만 출력하세요. 다른 설명이나 markdown 코드블록 표시 없이 순수 JSON만 출력하세요.

{
  "ox": [
    {
      "relatedPoint": "관련된 핵심 개념 이름",
      "question": "OX 문제 문장",
      "answer": true,
      "explanation": "정답 해설 (한 줄)"
    }
  ]
}

기사 본문:
"""
${articleText}
"""

핵심 개념 목록:
${pointsData}`;
}

function buildOverviewPrompt(articleText, points) {
  const pointsData = JSON.stringify(
    points.map((p) => ({
      title: p.title,
      definition: p.definition,
      easy: p.easy,
      context: p.context,
      impact: p.impact,
    })),
    null,
    2
  );

  return `당신은 경제 뉴스 학습을 도와주는 AI 튜터입니다.
사용자는 방금 이 기사를 이해하는 데 필요한 핵심 개념들을 학습했습니다. 이제 그 개념을 바탕으로 기사 전체에서 실제로 일어난 사건과 흐름을 3개의 문단으로 요약하세요.

작성 원칙:
- 이 요약은 "이 기사에서 무슨 일이 있었는가"에 집중하세요. 이미 학습한 개념의 정의를 다시 설명하지 말고, 그 개념이 실제 사건 전개 속에서 어떻게 작동했는지 자연스럽게 녹여서 설명하세요.
- 1문단: 이 뉴스의 핵심 사실 — 누가, 무엇을, 언제, 왜 했는지
- 2문단: 그 결정/사건이 나오게 된 배경이나 경위, 학습한 개념이 여기서 어떻게 작용하는지
- 3문단: 이 사건이 앞으로 어떤 흐름으로 이어질지, 어떤 의미를 가지는지
- 경제 지식이 없는 입문자도 이해할 수 있게 자연스러운 문체로 쓰되, 과도하게 쉬운 단어로 낮추지는 마세요.

출력은 반드시 아래 JSON 형식으로만 출력하세요.
{
  "overview": "3문단 요약 (문단 사이는 줄바꿈 두 번으로 구분)"
}

기사 본문:
"""
${articleText}
"""

이미 학습한 핵심 개념:
${pointsData}`;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part.text || "").join("");
}

function stripJsonFence(rawText) {
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
}

function parseLessonData(rawText) {
  const cleaned = stripJsonFence(rawText);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "Gemini 응답을 JSON으로 파싱하지 못했습니다: " + err.message
    );
  }

  if (!parsed || !Array.isArray(parsed.points) || parsed.points.length === 0) {
    throw new Error("Gemini 응답에 points 배열이 없습니다.");
  }

  return {
    articleTitle: typeof parsed.articleTitle === "string" ? parsed.articleTitle.trim() : "",
    points: parsed.points,
  };
}

function parseQuizData(rawText, expectedCount) {
  const cleaned = stripJsonFence(rawText);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "Gemini 응답을 JSON으로 파싱하지 못했습니다: " + err.message
    );
  }

  if (!parsed || !Array.isArray(parsed.ox) || parsed.ox.length === 0) {
    throw new Error("Gemini 응답에 ox 배열이 없습니다.");
  }

  if (typeof expectedCount === "number" && parsed.ox.length !== expectedCount) {
    throw new Error(
      `OX 문제 개수(${parsed.ox.length})가 핵심 포인트 개수(${expectedCount})와 일치하지 않습니다.`
    );
  }

  return parsed.ox;
}

function parseOverviewData(rawText) {
  const cleaned = stripJsonFence(rawText);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "Gemini 응답을 JSON으로 파싱하지 못했습니다: " + err.message
    );
  }

  if (!parsed || typeof parsed.overview !== "string" || !parsed.overview.trim()) {
    throw new Error("Gemini 응답에 overview 문자열이 없습니다.");
  }

  return parsed.overview.trim();
}

function getApiKeyOrThrow() {
  const apiKey = window.APP_CONFIG && window.APP_CONFIG.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. config.js를 확인해주세요."
    );
  }
  return apiKey;
}

async function callGemini(prompt) {
  const apiKey = getApiKeyOrThrow();

  let response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
  } catch (err) {
    throw new Error("네트워크 오류로 Gemini API 요청에 실패했습니다: " + err.message);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Gemini API 요청 실패 (status ${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return extractGeminiText(data);
}

async function fetchLessonData(articleText) {
  const rawText = await callGemini(buildLessonPrompt(articleText));
  return parseLessonData(rawText);
}

async function fetchQuizQuestions(articleText, points) {
  const rawText = await callGemini(buildQuizPrompt(articleText, points));
  return parseQuizData(rawText, points.length);
}

async function fetchOverviewSummary(articleText, points) {
  const rawText = await callGemini(buildOverviewPrompt(articleText, points));
  return parseOverviewData(rawText);
}
