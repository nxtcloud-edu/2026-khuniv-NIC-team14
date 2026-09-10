// /api/crawl — 뉴스 기사 URL을 서버에서 대신 가져와 본문 텍스트만 추출합니다.
// 브라우저에서 직접 뉴스 사이트로 fetch하면 CORS에 막히기 때문에, 서버(Vercel Function)가
// 대신 요청을 보내고 결과(본문 텍스트)만 클라이언트로 돌려줍니다.
//
// 외부 라이브러리(@extractus/article-extractor 등) 없이, 가벼운 정규식 기반 파서로
// <p> 태그의 텍스트만 모아서 본문을 구성합니다. Readability 알고리즘만큼 정교하지는
// 않지만, 별도 의존성이 없어 서버리스 환경에서 번들링 문제 없이 안정적으로 동작합니다.

const MAX_LENGTH = 10000;
const MIN_EXTRACTED_LENGTH = 200;

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

  let html;
  try {
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });

    if (!upstream.ok) {
      res.status(502).json({
        error: `기사 페이지를 가져오지 못했어요 (status ${upstream.status}). URL을 확인하거나 본문을 직접 붙여넣어 주세요.`,
      });
      return;
    }

    html = await upstream.text();
  } catch (err) {
    res.status(502).json({
      error: "기사를 가져오는 중 오류가 발생했어요. URL을 확인하거나 본문을 직접 붙여넣어 주세요.",
    });
    return;
  }

  try {
    const title = extractTitle(html);
    const text = extractArticleText(html).slice(0, MAX_LENGTH);

    if (text.length < MIN_EXTRACTED_LENGTH) {
      res.status(422).json({
        error: "이 URL에서 기사 본문을 충분히 가져오지 못했어요. 본문을 직접 붙여넣어 주세요.",
      });
      return;
    }

    res.status(200).json({ title, text, url });
  } catch (err) {
    res.status(500).json({
      error: "기사 본문을 분석하는 중 오류가 발생했어요. 본문을 직접 붙여넣어 주세요.",
    });
  }
};

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTag(html, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gi");
  return html.replace(re, " ");
}

function extractTitle(html) {
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i
  );
  if (ogMatch && ogMatch[1]) return decodeEntities(ogMatch[1]).trim();

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) return decodeEntities(titleMatch[1]).trim();

  return "";
}

function extractArticleText(rawHtml) {
  let html = rawHtml;

  // 본문과 무관한 영역을 먼저 통째로 제거한다 (내비게이션, 광고, 스크립트 등)
  ["script", "style", "noscript", "header", "footer", "nav", "aside", "form", "iframe", "svg"].forEach(
    (tag) => {
      html = stripTag(html, tag);
    }
  );
  html = html.replace(/<!--[\s\S]*?-->/g, " ");

  // <p> 태그 본문만 모은다 (뉴스 기사는 대부분 본문이 <p>로 구성됨)
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    // 너무 짧은 문단(캡션, 저작권 표기, 버튼 텍스트 등으로 추정)은 제외
    if (text.length >= 20) {
      paragraphs.push(text);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join("\n").trim();
  }

  // <p> 태그가 거의 없는 구조(일부 사이트)에 대한 최후의 fallback: body 전체 텍스트
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  return decodeEntities(bodyHtml.replace(/<\/(div|p|br|li|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
