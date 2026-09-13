// auth.js — 로그인 필요 페이지 공용 가드 + 로그아웃
//
// index.html, lesson.html, overview.html, quiz.html, summary.html, complete.html,
// mypage.html, chatbot.html의 <head>에서 supabase-config.js 다음에 로드합니다.
// (login.html / splash.html은 이 스크립트를 쓰지 않습니다 — 그 페이지들은 반대로
// "이미 로그인되어 있으면 index.html로 보낸다"는 자체 체크를 합니다.)
//
// 세션 확인이 끝나기 전에 보호된 화면이 잠깐 보였다 사라지는 깜빡임을 막기 위해,
// 이 스크립트가 실행되자마자(=<head>에서 최대한 일찍) <html>에 auth-pending 클래스를
// 붙여 화면을 숨긴다. 세션이 있으면 다시 보여주고, 없으면 로그인 페이지로 보낸다.

const LOGIN_PAGE = "login.html";

document.documentElement.classList.add("auth-pending");

function revealPage() {
  document.documentElement.classList.remove("auth-pending");
}

async function requireAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) {
      window.location.replace(LOGIN_PAGE);
      return null;
    }
    revealPage();
    return data.session;
  } catch (err) {
    // supabase-js가 로드되지 않는 등 세션 확인 자체가 실패한 경우, 화면을 숨긴 채
    // 방치하지 않고 로그인 페이지로 보낸다.
    console.error("[auth] 세션 확인 실패:", err);
    window.location.replace(LOGIN_PAGE);
    return null;
  }
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = LOGIN_PAGE;
}

// 로그인 상태로 확인된 페이지라면, 사이드바 nav가 있는 경우 로그아웃 탭을 자동으로 붙인다.
// (페이지마다 HTML을 일일이 고치지 않도록 article-chatbot.js의 위젯 주입 방식과 동일하게 처리)
// .nav-link와 같은 클래스를 써서, 데스크톱 세로 목록/모바일 하단 탭바 레이아웃에
// 이미 되어 있는 반응형 처리를 그대로 물려받는다.
function injectLogoutButton() {
  const nav = document.querySelector(".nav");
  if (!nav || nav.querySelector("#logout-btn")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "logout-btn";
  btn.className = "nav-link logout-nav-btn";
  btn.innerHTML =
    '<span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg></span>로그아웃';
  btn.addEventListener("click", () => {
    if (confirm("로그아웃할까요?")) signOut();
  });

  nav.appendChild(btn);
}

requireAuth().then((session) => {
  if (session) injectLogoutButton();
});
