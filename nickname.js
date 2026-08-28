// nickname.html — 닉네임 입력 & 저장. 빈 값/공백만 있는 입력은 절대 통과시키지 않는다.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("nickname-form");
  const input = document.getElementById("nickname-input");
  const errorEl = document.getElementById("nickname-error");

  input.addEventListener("input", () => {
    errorEl.classList.remove("visible");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nickname = input.value.trim();
    if (!nickname) {
      errorEl.classList.add("visible");
      input.focus();
      return;
    }

    setNickname(nickname);
    window.location.href = "index.html";
  });
});
