// 정책자금 일정: 달마다 접수하는 공고 보여주기

const el = id => document.getElementById(id);

// 한국시간 기준 이번 달
const now = new Date(todayKST());
let year = now.getFullYear();
let month = now.getMonth(); // 0 ~ 11

const pad = n => String(n).padStart(2, "0");
const dayText = d => d ? d.replace(/-/g, ".").slice(2) : "";

// 빠르게 여러 번 누르면 늦게 온 옛 결과가 섞이지 않게 번호로 구분
let reqId = 0;

function statusBadge(status) {
  const span = document.createElement("span");
  span.className = `badge badge-${status}`;
  span.textContent = status;
  return span;
}

function card(p) {
  const a = document.createElement("a");
  a.className = "card card-line";
  a.href = p.url || "#";
  a.target = "_blank";
  a.rel = "noopener";

  const title = document.createElement("p");
  title.className = "card-title";
  title.textContent = p.title;

  const meta = document.createElement("p");
  meta.className = "card-meta";
  const period = p.apply_start || p.apply_end
    ? `${dayText(p.apply_start) || "?"} ~ ${dayText(p.apply_end) || "?"}`
    : "상시 접수";
  meta.textContent = [p.agency, period].filter(Boolean).join(" · ");

  a.append(statusBadge(p.status), title, meta);
  return a;
}

async function renderMonth() {
  const my = ++reqId;
  const start = `${year}-${pad(month + 1)}-01`;
  const endDate = new Date(year, month + 1, 0);
  const end = `${year}-${pad(month + 1)}-${pad(endDate.getDate())}`;

  el("month").textContent = `${year}년 ${month + 1}월`;
  el("list").innerHTML = "";
  el("empty").hidden = true;

  // 이번 달에 접수를 시작하거나 마감하는 공고
  const { data, error } = await sb
    .from("programs_view")
    .select("id, title, agency, apply_start, apply_end, url, status")
    .eq("category", "정책자금")
    .or(`and(apply_start.gte.${start},apply_start.lte.${end}),and(apply_end.gte.${start},apply_end.lte.${end})`);

  if (my !== reqId) return; // 더 최근에 누른 달이 있으면 이 결과는 버림

  if (error) {
    el("empty").textContent = "일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
    el("empty").hidden = false;
    return;
  }

  const items = (data || []).sort((a, b) =>
    (a.apply_start || a.apply_end || "").localeCompare(b.apply_start || b.apply_end || ""));

  if (items.length === 0) {
    el("empty").hidden = false;
    return;
  }
  items.forEach(p => el("list").append(card(p)));
}

async function renderAlways() {
  const { data, count } = await sb
    .from("programs_view")
    .select("id, title, agency, apply_start, apply_end, url, status", { count: "exact" })
    .eq("category", "정책자금")
    .is("apply_start", null)
    .is("apply_end", null)
    .order("title")
    .limit(20);

  const items = data || [];
  el("always-title").textContent = `상시 접수 정책자금 ${(count ?? items.length).toLocaleString("ko-KR")}건`;
  items.forEach(p => el("always-list").append(card(p)));

  if ((count ?? 0) > items.length) {
    el("always-note").textContent = `가나다 순으로 ${items.length}건을 먼저 보여드려요.`;
  }
}

el("prev").onclick = () => {
  month -= 1;
  if (month < 0) { month = 11; year -= 1; }
  renderMonth();
};

el("next").onclick = () => {
  month += 1;
  if (month > 11) { month = 0; year += 1; }
  renderMonth();
};

(async () => {
  await renderHeader();
  renderMonth();
  renderAlways();
})();
