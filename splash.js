// splash.html — 시작 화면. 닉네임 저장 여부에 따라 다음 화면을 분기한다.

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("splash-start-btn");

  startBtn.addEventListener("click", () => {
    window.location.href = getNickname() ? "index.html" : "nickname.html";
  });
});
