// 정책자금 일정: 기관이 안내하는 접수일정표를 그대로 보여주기

renderHeader();

// 보여줄 순서
const GROUPS = [
  { source: "semas", category: "직접대출", institution: "소상공인시장진흥공단" },
  { source: "semas", category: "대리대출", institution: "소상공인시장진흥공단" },
  { source: "kosmes", category: "지역본지부", institution: "중소벤처기업진흥공단" },
];

function badge(status) {
  const span = document.createElement("span");
  span.className = `badge badge-${status}`;
  span.textContent = status;
  return span;
}

function item(row) {
  const li = document.createElement("li");
  li.className = "sched-item";

  if (row.status) li.append(badge(row.status));

  if (row.target) {
    const name = document.createElement("p");
    name.className = "sched-target";
    name.textContent = row.target;
    li.append(name);
  }

  if (row.label) {
    const label = document.createElement("p");
    label.className = "sched-label";
    label.textContent = row.label;
    li.append(label);
  }

  const period = document.createElement("p");
  period.className = "sched-period";
  period.textContent = row.period_text;
  li.append(period);

  return li;
}

function noteLine(row) {
  const p = document.createElement("p");
  p.className = "sched-note";
  p.textContent = row.period_text;
  return p;
}

function section(group, rows, index) {
  const sec = document.createElement("section");
  sec.className = index % 2 === 1 ? "section gray" : "section";

  const inner = document.createElement("div");
  inner.className = "inner";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = group.institution;

  const title = document.createElement("h2");
  title.className = "title";
  title.textContent = group.category;

  inner.append(eyebrow, title);

  const list = document.createElement("ul");
  list.className = "sched-list";
  rows.filter(r => r.kind === "일정").forEach(r => list.append(item(r)));
  inner.append(list);

  rows.filter(r => r.kind === "안내").forEach(r => inner.append(noteLine(r)));

  const src = document.createElement("p");
  src.className = "sched-src";
  const link = document.createElement("a");
  link.href = rows[0].source_url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = `${group.institution} 안내 보기`;
  src.append(link);
  const checked = document.createElement("span");
  checked.textContent = ` · 최종 확인 ${rows[0].collected_at.slice(0, 10)}`;
  src.append(checked);
  inner.append(src);

  sec.append(inner);
  return sec;
}

(async () => {
  const box = document.getElementById("groups");

  const { data, error } = await sb
    .from("fund_schedules_view")
    .select("source, category, kind, target, label, period_text, status, source_url, collected_at, sort_order")
    .order("sort_order");

  if (error || !data || data.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "일정을 불러오지 못했어요. 잠시 후 다시 열어주세요.";
    box.append(p);
    return;
  }

  let index = 0;
  for (const group of GROUPS) {
    const rows = data.filter(r => r.source === group.source && r.category === group.category);
    if (rows.length === 0) continue;
    box.append(section(group, rows, index++));
  }
})();
