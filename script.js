// 뉴스레슨 — Gemini API 연동 공통 모듈
// index.html, lesson.html 등 여러 페이지에서 공유해서 사용합니다.

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL +
  ":generateContent";

const ARTICLE_STORAGE_KEY = "nl_article_text";

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

출력은 반드시 아래 JSON 형식으로만 출력하세요. 다른 설명이나 markdown 코드블록 표시 없이 순수 JSON만 출력하세요.

{
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

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part.text || "").join("");
}

function parseLessonPoints(rawText) {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

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

  return parsed.points;
}

async function fetchLessonPoints(articleText) {
  const apiKey = window.APP_CONFIG && window.APP_CONFIG.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. config.js를 확인해주세요."
    );
  }

  const prompt = buildLessonPrompt(articleText);

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
  const rawText = extractGeminiText(data);
  return parseLessonPoints(rawText);
}
