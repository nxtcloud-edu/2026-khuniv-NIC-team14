// 뉴스레슨 — Gemini API 연동 공통 모듈
// index.html, lesson.html, overview.html, quiz.html, summary.html, complete.html, chatbot.html에서 공유해서 사용합니다.
// 실제 Gemini 호출은 서버(/api/gemini)가 대신 해주기 때문에, 여기서는 API 키를 전혀 다루지 않습니다.

const API_PROXY_ENDPOINT = "/api/gemini";
const CRAWL_PROXY_ENDPOINT = "/api/crawl";

// ---------------------------------------------------------------------------
// sessionStorage 키 — "지금 학습 중인 기사" 흐름 전용 임시 데이터.
// 학습이 끝나고 새로 시작하면 사라져도 되는 값들이라 sessionStorage에 둔다.
// (영구 기록은 storage.js의 localStorage 키(newsLessonHistory 등)를 사용)
// ---------------------------------------------------------------------------
const ARTICLE_STORAGE_KEY = "nl_article_text";
const ARTICLE_TITLE_KEY = "nl_article_title";
const ARTICLE_URL_KEY = "nl_article_url";
const LESSON_POINTS_KEY = "nl_lesson_points";
const LESSON_POINTS_FOR_KEY = "nl_lesson_points_for";
const OVERVIEW_DATA_KEY = "nl_overview_data";
const OVERVIEW_DATA_FOR_KEY = "nl_overview_data_for";
const QUIZ_DATA_KEY = "nl_quiz_data";
const QUIZ_DATA_FOR_KEY = "nl_quiz_data_for";
const QUIZ_RESULT_KEY = "nl_quiz_result";
const SUMMARY_TEXT_KEY = "nl_summary_text";
const CHATBOT_HISTORY_KEY = "nl_chatbot_history";
const ARTICLE_CHAT_HISTORY_PREFIX = "nl_article_chat_history_";

const CHATBOT_SYSTEM_PROMPT = `당신은 경제 상식을 쉽게 설명해주는 AI 튜터입니다.
사용자의 경제 관련 질문에 대해 정확하고 이해하기 쉽게 답변하세요.

원칙:
- 전공 용어를 사용할 때는 간단히 풀어서 설명하세요
- 답변은 너무 길지 않게, 핵심 위주로 3~5문장 이내로 작성하세요
- 경제와 무관한 질문(잡담, 다른 주제, 일상 대화 등)이 오면, 자연스럽게 넘기지 말고 "이 질문은 경제 관련 주제가 아니라서 답변드리기 어려워요"라는 취지로 명확히 알려주세요. 그 다음 원한다면 경제 관련 질문을 다시 해달라고 안내하세요.
- 확실하지 않은 사실(최신 수치, 특정 날짜의 정확한 통계 등)에 대해서는 단정적으로 말하지 말고, 일반적인 원리 위주로 설명하세요`;

function buildArticleChatSystemPrompt(articleText) {
  return `${CHATBOT_SYSTEM_PROMPT}

추가 규칙:
- 사용자는 지금 아래 기사를 학습하는 중입니다. 질문이 이 기사와 관련 있다면 기사 내용을 우선 참고해서 답하세요.
- 기사와 직접 관련 없는 일반적인 경제 질문이 오더라도 평소처럼 답변하세요.
- 기사에 나오지 않은 내용을 추측해서 사실처럼 말하지 마세요. 기사에 없는 정보라면 그렇다고 밝히세요.

현재 학습 중인 기사:
"""
${articleText}
"""`;
}

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
사용자는 방금 이 기사를 이해하는 데 필요한 핵심 개념들을 학습했습니다. 이제 그 개념을 바탕으로 기사에서 실제로 일어난 일을 5줄 이내로 요약하세요.

작성 원칙:
기사에서 실제로 일어난 일을 5줄 이내로 요약하세요. 문단 구분 없이, 핵심 사실 위주로 간결하게 정리하세요. 각 줄은 하나의 핵심 사실을 담아야 하며, 이미 학습한 개념의 정의를 반복하지 마세요. 경제 지식이 없는 입문자도 이해할 수 있게 자연스러운 문체로 쓰되, 과도하게 쉬운 단어로 낮추지는 마세요.

출력은 반드시 아래 JSON 형식으로만 출력하세요.
{
  "overview": "5줄 이내 요약 (각 줄은 줄바꿈으로 구분)"
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

  if (parsed.points.length > 3) {
    console.warn("Gemini가 3개를 초과하는 포인트를 반환해 상위 3개만 사용합니다");
    parsed.points = parsed.points.slice(0, 3);
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

// ---------------------------------------------------------------------------
// 서버(/api/gemini) 호출 — API 키는 서버 환경변수에만 존재하고 클라이언트로는
// 절대 내려오지 않습니다. 예전에는 여기서 window.APP_CONFIG.GEMINI_API_KEY를
// 읽어 Gemini 엔드포인트를 직접 호출했지만, 그 방식은 브라우저 개발자도구로
// 키가 그대로 노출되는 문제가 있어 서버 프록시 방식으로 바꿨습니다.
// ---------------------------------------------------------------------------
async function callGeminiRaw(payload) {
  let response;
  try {
    response = await fetch(API_PROXY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error("네트워크 오류로 서버 요청에 실패했습니다: " + err.message);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // 응답 본문이 JSON이 아닌 경우 무시하고 아래에서 상태코드로 처리
  }

  if (!response.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      (data && data.error && data.error.message) ||
      `서버 요청 실패 (status ${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function callGemini(prompt) {
  const data = await callGeminiRaw({ contents: [{ parts: [{ text: prompt }] }] });
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

async function callGeminiChat(messages, systemPrompt) {
  const contents = messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.text }],
  }));

  const data = await callGeminiRaw({
    contents,
    systemInstruction: { parts: [{ text: systemPrompt || CHATBOT_SYSTEM_PROMPT }] },
  });

  const text = extractGeminiText(data).trim();
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }
  return text;
}

async function fetchChatReply(messages) {
  return callGeminiChat(messages);
}

// 학습 중인 기사를 컨텍스트로 넣어 답하는 챗봇 (lesson/overview/summary 등에서 사용)
async function fetchArticleChatReply(messages, articleText) {
  return callGeminiChat(messages, buildArticleChatSystemPrompt(articleText));
}

// ---------------------------------------------------------------------------
// 서버(/api/crawl) 호출 — 뉴스 기사 URL을 서버가 대신 가져와 본문 텍스트만 돌려줍니다.
// ---------------------------------------------------------------------------
async function fetchArticleFromUrl(url) {
  let response;
  try {
    response = await fetch(CRAWL_PROXY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch (err) {
    throw new Error("네트워크 오류로 서버 요청에 실패했습니다: " + err.message);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // ignore
  }

  if (!response.ok) {
    const message = (data && data.error) || `서버 요청 실패 (status ${response.status})`;
    throw new Error(message);
  }

  return data; // { title, text, source, url }
}
