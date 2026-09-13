// splash.html — 시작 화면. 로그인 세션 여부에 따라 다음 화면을 분기한다.

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("splash-start-btn");

  startBtn.addEventListener("click", async () => {
    const { data } = await supabaseClient.auth.getSession();
    window.location.href = data.session ? "index.html" : "login.html";
  });
});
