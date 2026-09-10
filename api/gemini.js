// /api/gemini — Gemini generateContent 프록시
// 클라이언트는 API 키를 절대 알지 못하고, 이 서버리스 함수가 서버 환경변수(GEMINI_API_KEY)로만
// 실제 Gemini API를 호출합니다. script.js가 기존에 만들던 { contents, systemInstruction } 본문을
// 그대로 이 엔드포인트로 보내면 됩니다.

const GEMINI_MODEL = "gemini-3.6-flash";

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

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({
      error: "Gemini API 호출 중 오류가 발생했습니다: " + err.message,
    });
  }
};
