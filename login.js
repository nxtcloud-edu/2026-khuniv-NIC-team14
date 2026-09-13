// login.html — Supabase Auth 이메일/비밀번호 로그인 · 회원가입

document.addEventListener("DOMContentLoaded", async () => {
  // 이미 로그인되어 있다면 로그인 화면을 보여줄 필요가 없다.
  // (세션 확인 자체가 실패해도 로그인 폼은 정상적으로 쓸 수 있어야 하므로 여기서 막지 않는다.)
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData.session) {
      window.location.replace("index.html");
      return;
    }
  } catch (err) {
    console.error("[login] 세션 확인 실패:", err);
  }

  const titleEl = document.getElementById("auth-title");
  const subtitleEl = document.getElementById("auth-subtitle");
  const form = document.getElementById("auth-form");
  const nicknameField = document.getElementById("nickname-field");
  const nicknameInput = document.getElementById("nickname-input");
  const emailInput = document.getElementById("email-input");
  const passwordInput = document.getElementById("password-input");
  const errorEl = document.getElementById("auth-error");
  const successEl = document.getElementById("auth-success");
  const submitBtn = document.getElementById("auth-submit-btn");
  const toggleBtn = document.getElementById("auth-toggle-btn");

  let mode = "login"; // "login" | "signup"

  function clearMessages() {
    errorEl.classList.remove("visible");
    errorEl.textContent = "";
    successEl.style.display = "none";
    successEl.textContent = "";
  }

  function showError(message) {
    successEl.style.display = "none";
    errorEl.textContent = message;
    errorEl.classList.add("visible");
  }

  function showSuccess(message) {
    errorEl.classList.remove("visible");
    successEl.textContent = message;
    successEl.style.display = "block";
  }

  function setMode(next) {
    mode = next;
    clearMessages();

    if (mode === "signup") {
      titleEl.textContent = "처음 오셨네요";
      subtitleEl.textContent = "닉네임과 이메일, 비밀번호로 계정을 만들어주세요.";
      nicknameField.style.display = "block";
      passwordInput.autocomplete = "new-password";
      submitBtn.textContent = "회원가입";
      toggleBtn.textContent = "이미 계정이 있으신가요? 로그인";
    } else {
      titleEl.textContent = "다시 오셨네요";
      subtitleEl.textContent = "이메일과 비밀번호로 로그인해주세요.";
      nicknameField.style.display = "none";
      passwordInput.autocomplete = "current-password";
      submitBtn.textContent = "로그인";
      toggleBtn.textContent = "계정이 없으신가요? 회원가입";
    }
  }

  function setSubmitting(submitting) {
    submitBtn.disabled = submitting;
    if (submitting) {
      submitBtn.textContent = "처리 중...";
    } else {
      submitBtn.textContent = mode === "signup" ? "회원가입" : "로그인";
    }
  }

  function translateAuthError(err) {
    const msg = (err && err.message) || "";
    if (msg.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요.";
    if (msg.includes("User already registered")) return "이미 가입된 이메일이에요. 로그인해주세요.";
    if (msg.toLowerCase().includes("password should be at least")) return "비밀번호는 6자 이상이어야 해요.";
    if (msg.includes("Unable to validate email address")) return "이메일 형식을 확인해주세요.";
    return msg || "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";
  }

  toggleBtn.addEventListener("click", () => {
    setMode(mode === "login" ? "signup" : "login");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const nickname = nicknameInput.value.trim();

    if (!email || !password) {
      showError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      showError("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (mode === "signup" && !nickname) {
      showError("닉네임을 입력해주세요.");
      nicknameInput.focus();
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "signup") {
        // nickname은 auth.users.raw_user_meta_data에 실려서, DB 트리거(supabase/migration.sql의
        // handle_new_user)가 profiles 테이블에 자동으로 행을 만들 때 사용된다.
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { nickname } },
        });
        if (error) throw error;

        if (data.session) {
          window.location.href = "index.html";
          return;
        }

        // 프로젝트에 이메일 확인이 켜져 있으면 signUp() 직후에는 세션이 없다.
        showSuccess("가입 확인 이메일을 보냈어요. 메일함을 확인한 뒤 로그인해주세요.");
        setMode("login");
        emailInput.value = email;
        passwordInput.value = "";
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "index.html";
        return;
      }
    } catch (err) {
      console.error("[login] Supabase Auth 오류:", err);
      showError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  });
});
