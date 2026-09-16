// 관리자 화면: 회원과 공고 데이터 보기 (조회만)

const $ = id => document.getElementById(id);
const num = n => Number(n || 0).toLocaleString("ko-KR");

// 수집한 곳 이름
const SOURCE_NAME = {
  bizinfo: "기업마당",
  kstartup: "K-Startup",
  gov24: "보조금24",
  mss: "중기부 사업공고",
  extract: "조건 정리"
};

const dayText = t => t ? new Date(t).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";
const timeText = t => t
  ? new Date(t).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  : "-";

function statCards(box, items) {
  box.innerHTML = "";
  items.forEach(([label, value]) => {
    const div = document.createElement("div");
    div.className = "stat";
    div.innerHTML = `<p class="stat-num">${value}</p><p class="stat-label">${label}</p>`;
    box.append(div);
  });
}

// 가로 막대 (지역·업종·규모)
function barGroup(title, rows) {
  const wrap = document.createElement("div");
  wrap.className = "bar-group";

  const h = document.createElement("p");
  h.className = "bar-title";
  h.textContent = title;
  wrap.append(h);

  const max = Math.max(...rows.map(r => r.v));
  rows.forEach(r => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const name = document.createElement("span");
    name.textContent = r.k;

    const track = document.createElement("span");
    track.className = "bar-track";
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.style.width = `${Math.round((r.v / max) * 100)}%`;
    track.append(bar);

    const count = document.createElement("span");
    count.className = "bar-num";
    count.textContent = `${num(r.v)}명`;

    row.append(name, track, count);
    wrap.append(row);
  });

  return wrap;
}

function table(el, head, rows) {
  el.innerHTML = "";
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  head.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    tr.append(th);
  });
  thead.append(tr);

  const tbody = document.createElement("tbody");
  rows.forEach(cells => {
    const line = document.createElement("tr");
    cells.forEach(c => {
      const td = document.createElement("td");
      td.textContent = c;
      line.append(td);
    });
    tbody.append(line);
  });

  el.append(thead, tbody);
}

function condText(m) {
  const years = m.founded_on
    ? `${Math.max(0, new Date(todayKST()).getFullYear() - new Date(m.founded_on).getFullYear())}년차`
    : null;
  const parts = [m.region_sido, m.industry, m.company_size, years, m.revenue_range,
    m.does_export ? "수출" : null, m.does_online_sales ? "온라인판매" : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "아직 입력 안 함";
}

function render(stats, members) {
  const s = stats.programs_by_status || {};

  statCards($("stat-members"), [
    ["전체 회원", num(stats.members.total)],
    ["조건 입력한 회원", num(stats.members.with_cond)],
    ["최근 7일 가입", num(stats.members.last7)],
    ["오늘 추천", `${num(stats.matches_today)}건`]
  ]);

  statCards($("stat-programs"), [
    ["전체 공고", num(stats.programs_total)],
    ["접수중", num(s["접수중"])],
    ["예정", num(s["예정"])],
    ["마감", num(s["마감"])],
    ["상시", num(s["상시"])],
    ["조건 정리 남음", num(stats.programs_not_extracted)]
  ]);

  const bars = $("bars");
  const groups = [
    ["지역", stats.by_region],
    ["업종", stats.by_industry],
    ["기업규모", stats.by_size]
  ].filter(([, rows]) => rows && rows.length);

  if (groups.length === 0) {
    $("bars-empty").hidden = false;
  } else {
    groups.forEach(([title, rows]) => bars.append(barGroup(title, rows)));
  }

  table($("members"),
    ["가입일", "이메일", "로그인 수단", "조건", "오늘 추천"],
    members.map(m => [
      dayText(m.created_at),
      m.email || "-",
      m.provider || "-",
      condText(m),
      `${num(m.today_matches)}건`
    ]));

  table($("crawl"),
    ["가져온 곳", "최근 실행", "찾은 수", "새로 담은 수", "오류"],
    (stats.crawl || []).map(c => [
      SOURCE_NAME[c.source] || c.source,
      timeText(c.run_at),
      num(c.found),
      num(c.inserted),
      c.error || "없음"
    ]));

  $("dash").hidden = false;
}

// 관리자 로그인 (이 화면에서만)
function setupLogin() {
  $("login-box").hidden = false;
  const notice = $("login-notice");

  $("login-form").onsubmit = async e => {
    e.preventDefault();
    notice.textContent = "로그인 중이에요...";

    const { error } = await sb.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) {
      notice.textContent = "이메일 또는 비밀번호를 다시 확인해 주세요.";
      return;
    }
    location.reload();
  };
}

(async () => {
  const user = await renderHeader();
  if (!user) {
    setupLogin();
    return;
  }

  // 관리자가 아니면 데이터를 받지 못하므로 홈으로 보냄
  const [{ data: stats, error }, { data: members }] = await Promise.all([
    sb.rpc("admin_stats"),
    sb.rpc("admin_members", { max_rows: 50 })
  ]);

  if (error || !stats) {
    location.href = "index.html";
    return;
  }

  render(stats, members || []);
})();
