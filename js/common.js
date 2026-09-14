// Supabase 연결 (config.js 다음에 불러오기)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 한국시간 오늘 날짜 (YYYY-MM-DD)
function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

// 머리말: 로그인 상태에 따라 버튼 바꾸기
async function renderHeader() {
  const header = document.getElementById("header");
  const { data: { user } } = await sb.auth.getUser();

  header.innerHTML = `
    <a class="logo" href="index.html">지원금 찾기</a>
    <button class="header-btn" id="header-btn">${user ? "로그아웃" : "로그인"}</button>
  `;

  document.getElementById("header-btn").onclick = async () => {
    if (user) {
      await sb.auth.signOut();
      location.href = "index.html";
    } else {
      location.href = "login.html";
    }
  };

  return user;
}
