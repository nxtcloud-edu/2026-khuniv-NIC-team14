// /api/crawl — 뉴스 기사 URL을 서버에서 대신 가져와 본문 텍스트만 추출합니다.
// 브라우저에서 직접 뉴스 사이트로 fetch하면 CORS에 막히기 때문에, 서버(Vercel Function)가
// 대신 요청을 보내고 결과(본문 텍스트)만 클라이언트로 돌려줍니다.

const { extract } = require("@extractus/article-extractor");

const MAX_LENGTH = 10000;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "잘못된 요청 본문입니다." });
    return;
  }

  const url = ((body && body.url) || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: "올바른 기사 URL을 입력해주세요. (http:// 또는 https://로 시작해야 해요)" });
    return;
  }

  try {
    const article = await extract(url);

    if (!article || !article.content) {
      res.status(422).json({
        error: "이 URL에서 기사 본문을 자동으로 가져오지 못했어요. 기사 본문을 직접 붙여넣어 주세요.",
      });
      return;
    }

    const text = stripHtml(article.content).slice(0, MAX_LENGTH);
    if (!text.trim()) {
      res.status(422).json({
        error: "이 URL에서 기사 본문을 자동으로 가져오지 못했어요. 기사 본문을 직접 붙여넣어 주세요.",
      });
      return;
    }

    res.status(200).json({
      title: article.title || "",
      text,
      source: article.source || "",
      url,
    });
  } catch (err) {
    res.status(502).json({
      error: "기사를 가져오는 중 오류가 발생했어요. URL을 확인하거나 본문을 직접 붙여넣어 주세요.",
    });
  }
};

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|br|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
