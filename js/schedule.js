// 정책자금 일정
// - 소진공: 기관이 올린 안내 이미지를 그대로 보여준다 (못 불러오면 글 목록으로 대체)
// - 중진공: 기관 안내와 같은 표로 보여준다

renderHeader();

// 소진공 두 가지(직접대출·대리대출)는 PC 에서 한 섹션에 나란히 보여준다
const SEMAS = {
  source: "semas",
  institution: "소상공인시장진흥공단",
  categories: ["직접대출", "대리대출"],
};
const KOSMES = { source: "kosmes", category: "지역본지부", institution: "중소벤처기업진흥공단" };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function badge(status) {
  return el("span", `badge badge-${status}`, status);
}

// 자금명이 앞에 또 나오면 빼고 기간만 (원문은 그대로 보관)
function periodText(row) {
  if (!row.target || !row.period_text.startsWith(row.target)) return row.period_text;
  const rest = row.period_text
    .slice(row.target.length)
    .replace(/^\s*(?:은|는)?\s*접수는\s*/, "")
    .replace(/^\s*(?:은|는)\s*/, "")
    .trim();
  return rest || row.period_text;
}

// 글 목록 (이미지를 못 불러왔을 때 쓰는 대체 화면)
function textList(rows) {
  const list = el("ul", "sched-list");
  rows.filter(r => r.kind === "일정").forEach(row => {
    const li = el("li", "sched-item");
    if (row.status) li.append(badge(row.status));
    if (row.target) li.append(el("p", "sched-target", row.target));
    li.append(el("p", "sched-period", periodText(row)));
    list.append(li);
  });
  return list;
}

// 중진공: 지역 × 월 표
function kosmesTable(rows) {
  const schedules = rows.filter(r => r.kind === "일정");
  const areas = [...new Set(schedules.map(r => r.target))];
  const months = [...new Set(schedules.map(r => r.label))];

  const wrap = el("div", "table-wrap");
  const table = el("table", "sched-table");

  const thead = el("thead");
  const headRow = el("tr");
  headRow.append(el("th", null, "지역본지부"));
  months.forEach(m => headRow.append(el("th", null, m)));
  thead.append(headRow);

  const tbody = el("tbody");
  areas.forEach(area => {
    const tr = el("tr");
    tr.append(el("th", "row-head", area));
    months.forEach(month => {
      const found = schedules.find(r => r.target === area && r.label === month);
      const td = el("td");
      td.dataset.label = month;
      if (found) {
        td.append(el("p", "cell-period", found.period_text));
        if (found.status) td.append(badge(found.status));
      } else {
        td.textContent = "-";
      }
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

// 이미지 한 장 (소진공) — 누르면 원문으로
function imageCard(category, rows) {
  const card = el("div", "fund-card");
  card.append(el("p", "fund-card-title", category));

  const image = rows.find(r => r.kind === "이미지" && r.image_url);

  if (image) {
    const link = el("a", "sched-figure");
    link.href = rows[0].source_url;
    link.target = "_blank";
    link.rel = "noopener";

    const img = el("img", "sched-img");
    img.src = image.image_url;
    img.alt = image.period_text;
    img.loading = "lazy";
    // 이미지를 못 불러오면 글 목록으로 대체
    img.onerror = () => {
      link.remove();
      card.append(textList(rows));
    };

    link.append(img);
    card.append(link);
  } else {
    card.append(textList(rows));
  }
  return card;
}

function sourceLine(institution, row) {
  const p = el("p", "sched-src");
  const link = el("a", null, `${institution} 안내 보기`);
  link.href = row.source_url;
  link.target = "_blank";
  link.rel = "noopener";
  p.append(link, el("span", null, ` · 최종 확인 ${row.collected_at.slice(0, 10)}`));
  return p;
}

// 소진공: 한 섹션 안에 직접대출·대리대출 나란히 (좁은 화면에서는 위아래로)
function semasSection(data) {
  const sec = el("section", "section");
  const inner = el("div", "inner inner-wide");

  inner.append(el("p", "inst", SEMAS.institution));

  const pair = el("div", "fund-pair");
  let first = null;

  for (const category of SEMAS.categories) {
    const rows = data.filter(r => r.source === SEMAS.source && r.category === category);
    if (rows.length === 0) continue;
    first = first || rows[0];
    pair.append(imageCard(category, rows));
  }
  if (!first) return null;

  inner.append(pair);
  inner.append(sourceLine(SEMAS.institution, first));
  sec.append(inner);
  return sec;
}

// 중진공: 지역 × 월 표
function kosmesSection(data) {
  const rows = data.filter(r => r.source === KOSMES.source && r.category === KOSMES.category);
  if (rows.length === 0) return null;

  const sec = el("section", "section gray");
  const inner = el("div", "inner");

  inner.append(el("p", "inst", KOSMES.institution));
  inner.append(kosmesTable(rows));

  rows.filter(r => r.kind === "안내")
    .forEach(r => inner.append(el("p", "sched-note", r.period_text)));

  inner.append(sourceLine(KOSMES.institution, rows[0]));
  sec.append(inner);
  return sec;
}

(async () => {
  const box = document.getElementById("groups");

  const { data, error } = await sb
    .from("fund_schedules_view")
    .select("source, category, kind, target, label, period_text, image_url, status, source_url, collected_at, sort_order")
    .order("sort_order");

  if (error || !data || data.length === 0) {
    box.append(el("p", "empty", "일정을 불러오지 못했어요. 잠시 후 다시 열어주세요."));
    return;
  }

  [semasSection(data), kosmesSection(data)]
    .filter(Boolean)
    .forEach(sec => box.append(sec));
})();
