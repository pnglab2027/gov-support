// 단계별 조건 입력 → 건수 표시 → 결과 목록
// 선택지 값은 supabase/functions/extract-conditions/schema.ts 와 같아야 매칭됨

const STEPS = [
  {
    key: "region_sido",
    question: "사업장이 어디에 있나요?",
    hint: "사업자등록증 주소 기준이에요.",
    grid: true,
    options: ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
      "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"].map(v => ({ label: v, value: v })),
  },
  {
    key: "industry",
    question: "어떤 일을 하시나요?",
    hint: "가장 가까운 업종을 골라주세요.",
    grid: true,
    options: ["제조업", "음식점업", "도소매업", "숙박업", "정보통신업", "건설업",
      "운수업", "농림어업", "문화콘텐츠업", "전문서비스업", "기타서비스업"].map(v => ({ label: v, value: v })),
  },
  {
    key: "export",
    question: "해외로 물건이나 서비스를 팔고 계신가요?",
    hint: "수출 실적이 있으면 '네'를 골라주세요.",
    options: [
      { label: "네, 수출하고 있어요", value: true },
      { label: "아니요", value: false },
    ],
  },
  {
    key: "online_sales",
    question: "온라인으로 판매하고 계신가요?",
    hint: "스마트스토어, 쿠팡, 자사몰 등이에요.",
    options: [
      { label: "네, 온라인으로 팔아요", value: true },
      { label: "아니요", value: false },
    ],
  },
  {
    key: "company_size",
    question: "기업 규모가 어떻게 되나요?",
    hint: "",
    options: [
      { label: "아직 창업 전이에요", value: "예비창업자" },
      { label: "소상공인", value: "소상공인" },
      { label: "중소기업", value: "중소기업" },
      { label: "중견기업", value: "중견기업" },
    ],
  },
  {
    key: "years",
    question: "사업을 한 지 얼마나 되셨나요?",
    hint: "",
    options: [
      { label: "1년 미만", value: 0 },
      { label: "1년 ~ 3년", value: 3 },
      { label: "3년 ~ 7년", value: 7 },
      { label: "7년 이상", value: 10 },
    ],
  },
  {
    key: "revenue",
    question: "연 매출이 얼마나 되나요?",
    hint: "작년 기준으로 골라주세요.",
    options: [
      { label: "1억 원 미만", value: 10000 },
      { label: "1억 ~ 5억 원", value: 50000 },
      { label: "5억 ~ 10억 원", value: 100000 },
      { label: "10억 ~ 30억 원", value: 300000 },
      { label: "30억 원 이상", value: 1000000 },
    ],
  },
  {
    key: "certifications",
    question: "가지고 있는 인증이 있나요?",
    hint: "여러 개 고를 수 있어요. 없으면 그냥 다음을 눌러주세요.",
    multi: true,
    grid: true,
    options: ["벤처기업", "이노비즈", "메인비즈", "기업부설연구소", "여성기업",
      "장애인기업", "사회적기업", "특허보유"].map(v => ({ label: v, value: v })),
  },
];

const answers = {};   // key -> { value, label }
let stepIndex = 0;
let picked = [];      // 여러 개 고르는 단계에서 임시 저장
let user = null;

const el = id => document.getElementById(id);

// 조건 모으기 (건너뛴 항목은 넣지 않음)
function buildCond() {
  const cond = {};
  for (const [key, ans] of Object.entries(answers)) cond[key] = ans.value;
  return cond;
}

function renderStep() {
  const step = STEPS[stepIndex];
  picked = [];

  el("progress").textContent = `${stepIndex + 1} / ${STEPS.length}`;
  el("question").textContent = step.question;
  el("hint").textContent = step.hint;
  el("back").hidden = stepIndex === 0;
  el("skip").hidden = !!step.multi;

  const box = el("options");
  box.className = step.grid ? "options grid2" : "options";
  box.innerHTML = "";

  step.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.type = "button";
    btn.textContent = opt.label;
    btn.onclick = () => {
      if (step.multi) {
        const on = picked.some(p => p.value === opt.value);
        picked = on ? picked.filter(p => p.value !== opt.value) : [...picked, opt];
        btn.setAttribute("aria-pressed", String(!on));
        el("confirm").textContent = picked.length ? "선택 완료" : "해당 없음 · 다음";
      } else {
        answers[step.key] = opt;
        showCount();
      }
    };
    box.append(btn);
  });

  const confirm = el("confirm");
  confirm.hidden = !step.multi;
  if (step.multi) {
    confirm.textContent = "해당 없음 · 다음";
    confirm.onclick = () => {
      answers[step.key] = {
        value: picked.map(p => p.value),
        label: picked.map(p => p.label).join(", ") || "없음",
      };
      showCount();
    };
  }

  el("ask").hidden = false;
  el("count").hidden = true;
  el("result").hidden = true;
  window.scrollTo(0, 0);
}

// 숫자 올라가는 애니메이션
function countUp(target) {
  const node = el("count-num");
  const start = performance.now();
  const tick = now => {
    const t = Math.min((now - start) / 700, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = Math.round(target * eased).toLocaleString("ko-KR");
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function showCount() {
  const last = stepIndex === STEPS.length - 1;

  el("ask").hidden = true;
  el("count").hidden = false;
  el("count-num").textContent = "0";
  el("count-msg").textContent = "세어보는 중...";
  el("next").hidden = true;
  window.scrollTo(0, 0);

  const { data, error } = await sb.rpc("count_matches", { cond: buildCond() });
  if (error) {
    el("count-msg").textContent = "건수를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
    el("next").hidden = false;
    return;
  }

  const n = Number(data) || 0;
  countUp(n);
  el("count-msg").textContent =
    last ? `최종 ${n.toLocaleString("ko-KR")}건이 적합한 상품으로 보여요 !`
    : stepIndex === 0 ? `맞는 상품이 ${n.toLocaleString("ko-KR")}건이 보여요 !`
    : `${n.toLocaleString("ko-KR")}건으로 좁혀졌어요 !`;

  const next = el("next");
  next.hidden = false;
  next.textContent = last ? "결과 보기" : "다음";
  next.onclick = () => {
    if (last) return showResult();
    stepIndex += 1;
    renderStep();
  };
}

function statusBadge(status) {
  const span = document.createElement("span");
  span.className = `badge badge-${status}`;
  span.textContent = status;
  return span;
}

async function showResult() {
  el("ask").hidden = true;
  el("count").hidden = true;
  el("result").hidden = false;
  window.scrollTo(0, 0);

  const cond = buildCond();
  const { data, error } = await sb.rpc("find_matches", { cond });
  const list = el("result-list");
  list.innerHTML = "";

  if (error) {
    el("result-title").textContent = "결과를 불러오지 못했어요";
    return;
  }

  const items = data || [];
  el("result-title").textContent = `${items.length.toLocaleString("ko-KR")}건을 찾았어요`;

  if (items.length === 0) {
    el("result-empty").hidden = false;
  } else {
    const shown = items.slice(0, 20);
    el("result-note").textContent = items.length > shown.length
      ? `마감이 가까운 순서로 ${shown.length}건을 먼저 보여드려요.`
      : "마감이 가까운 순서예요.";

    shown.forEach(p => {
      const card = document.createElement("a");
      card.className = "card card-line";
      card.href = p.url || "#";
      card.target = "_blank";
      card.rel = "noopener";

      const title = document.createElement("p");
      title.className = "card-title";
      title.textContent = p.title;

      const meta = document.createElement("p");
      meta.className = "card-meta";
      meta.textContent = [p.agency, p.apply_end ? `~ ${p.apply_end} 마감` : "상시 접수"]
        .filter(Boolean).join(" · ");

      card.append(statusBadge(p.status), title, meta);
      list.append(card);
    });
  }

  renderResultFoot(cond);
}

// 로그인했으면 조건 저장, 아니면 가입 권유
async function renderResultFoot(cond) {
  const foot = el("result-foot");
  const notice = el("result-notice");
  foot.innerHTML = "";

  if (!user) {
    const btn = document.createElement("a");
    btn.className = "btn btn-kakao";
    btn.href = "login.html";
    btn.textContent = "카카오로 3초 가입하고 매일 추천 받기";
    foot.append(btn);
    notice.textContent = "가입하면 입력한 조건으로 매일 아침 맞는 지원금을 골라드려요.";
    return;
  }

  const years = answers.years ? answers.years.value : undefined;
  let founded;
  if (years !== undefined) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    founded = d.toLocaleDateString("sv-SE");
  }

  const row = {
    region_sido: cond.region_sido ?? null,
    industry: cond.industry ?? null,
    company_size: cond.company_size ?? null,
    revenue_range: answers.revenue ? answers.revenue.label : null,
    certifications: cond.certifications ?? null,
    does_export: cond.export ?? null,
    does_online_sales: cond.online_sales ?? null,
    updated_at: new Date().toISOString(),
  };
  if (founded !== undefined) row.founded_on = founded;

  const { error } = await sb.from("profiles").update(row).eq("id", user.id);
  notice.textContent = error
    ? "조건을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
    : "조건을 저장했어요. 내일 아침부터 맞는 지원금을 골라드릴게요.";
}

el("skip").onclick = () => {
  delete answers[STEPS[stepIndex].key];
  showCount();
};

el("back").onclick = () => {
  stepIndex -= 1;
  delete answers[STEPS[stepIndex].key];
  renderStep();
};

(async () => {
  user = await renderHeader();
  renderStep();
})();
