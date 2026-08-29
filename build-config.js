const fs = require("fs");
const path = require("path");

const apiKey = process.env.GEMINI_API_KEY || "";

if (!apiKey) {
  console.warn(
    "[build-config] 경고: GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다. 빈 값으로 config.js를 생성합니다."
  );
}

const content = `// 이 파일은 build-config.js에 의해 빌드 시점에 자동 생성됩니다. 직접 수정하지 마세요.
window.APP_CONFIG = {
  GEMINI_API_KEY: "${apiKey}",
};
`;

const outputPath = path.join(__dirname, "config.js");
fs.writeFileSync(outputPath, content);

console.log(`[build-config] config.js 생성 완료: ${outputPath}`);
