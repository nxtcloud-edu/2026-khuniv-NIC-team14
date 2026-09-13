// /api/gemini — Gemini generateContent 프록시
// 클라이언트는 API 키를 절대 알지 못하고, 이 서버리스 함수가 서버 환경변수(GEMINI_API_KEY)로만
// 실제 Gemini API를 호출합니다. script.js가 기존에 만들던 { contents, systemInstruction } 본문을
// 그대로 이 엔드포인트로 보내면 됩니다.

const GEMINI_MODEL = "gemini-3.6-flash";
// vercel.json의 functions.maxDuration(60s)보다 여유 있게 짧은 값으로 끊어서,
// 플랫폼이 함수를 강제 종료하기 전에 우리가 먼저 명확한 에러를 응답한다.
const UPSTREAM_TIMEOUT_MS = 50_000;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "서버에 GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다.",
    });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "잘못된 요청 본문입니다." });
    return;
  }

  const { contents, systemInstruction } = body || {};
  if (!Array.isArray(contents) || contents.length === 0) {
    res.status(400).json({ error: "contents가 필요합니다." });
    return;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: {
          // 이 프록시가 다루는 작업(요약/포인트 추출/OX 생성)은 전부 형식이 고정된
          // 짧은 JSON 출력이라 깊은 추론이 필요 없다. Flash 계열 모델은 기본적으로
          // thinking(내부 사고)이 켜져 있는데, 긴 기사(1만자 이상)일수록 여기에
          // 시간을 많이 써서 응답이 1분 이상 걸리는 원인이 된다. thinkingBudget을
          // 0으로 꺼서 지연을 크게 줄인다.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    if (err.name === "AbortError") {
      res.status(504).json({
        error: `Gemini 응답이 ${UPSTREAM_TIMEOUT_MS / 1000}초 안에 오지 않아 요청을 중단했습니다. 잠시 후 다시 시도해주세요.`,
      });
      return;
    }
    res.status(502).json({
      error: "Gemini API 호출 중 오류가 발생했습니다: " + err.message,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
