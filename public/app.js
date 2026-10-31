const $ = (s) => document.querySelector(s),
  app = $("#app"),
  sheet = $("#sheet");
const icons = {
  bill: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  activity:
    '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  marketing: '<path d="m4 10 14-6v16L4 14zM4 10v4M8 16l1 5h3l-1-4M21 9v6"/>',
  game: '<path d="M6 7h12c3 0 5 12 2 13-2 1-4-4-5-4H9c-1 0-3 5-5 4C1 19 3 7 6 7Z"/><path d="M6 11v4m-2-2h4m8-1h.01M18 14h.01M9 7l1-3h4"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  chart: '<path d="M4 20V10m6 10V4m6 16v-8m5 8H2"/>',
};
const icon = (k) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[k] || icons.arrow}</svg>`;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) =>
  (Number(n || 0) / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
const signed = (n) => (n >= 0 ? "+" : "−") + money(Math.abs(n));
let state,
  tab = "bill",
  selected,
  month,
  hotData,
  activeSource = "全部",
  pendingCampaign = false;
async function api(path, method = "GET", data) {
  const r = await fetch("/api/" + path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "请求失败");
  return d;
}
let toastTimer;
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function heading(k, t, s) {
  return `<div class="heading"><h1>${t}</h1>${s ? `<p>${s}</p>` : ""}</div>`;
}
function showSheet(title, html) {
  $("#sheetContent").innerHTML =
    `<div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="关闭">✕</button></div>${html}`;
  if (!sheet.open) sheet.showModal();
  $("[data-close]").onclick = () => sheet.close();
}
sheet.addEventListener("click", (e) => {
  if (e.target === sheet) {
    const r = sheet.getBoundingClientRect();
    if (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right)
      sheet.close();
  }
});
async function sync() {
  state = await api("state");
  $("#storeName").textContent = state.settings.name;
}
function render() {
  const tabs = [
    ["bill", "账单"],
    ["activity", "活动"],
    ["marketing", "营销"],
    ["game", "游戏"],
  ];
  $("#tabs").innerHTML = tabs
    .map(
      ([k, v]) =>
        `<button data-tab="${k}" class="${tab === k ? "active" : ""}" aria-current="${tab === k ? "page" : "false"}">${icon(k)}<span>${v}</span></button>`,
    )
    .join("");
  $("#tabs")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          tab = b.dataset.tab;
          render();
          window.scrollTo(0, 0);
        }),
    );
  ({
    bill: renderBills,
    activity: renderActivities,
    marketing: renderMarketing,
    game: renderGames,
  })[tab]();
}
function renderBills() {
  const rows = state.bills.filter((b) => b.date.startsWith(month));
  const income = rows.reduce((s, b) => s + b.income, 0),
    expense = rows.reduce((s, b) => s + b.expense, 0),
    bill = state.bills.find((b) => b.date === selected);
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate(),
    offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const report = state.reports["report:" + selected];
  app.innerHTML = `<div class="page-top"><h1>账单</h1><span>${state.today.replaceAll("-", " / ")}</span></div><section class="balance"><div class="balance-period">${m} 月利润</div><div class="number"><span class="amount-value"><span class="currency">¥</span>${money(income - expense)}</span></div><div class="stats"><div><small>收入</small><strong>¥ ${money(income)}</strong></div><span class="stats-divider"></span><div><small>支出</small><strong>¥ ${money(expense)}</strong></div></div><button class="primary" id="addBill">${state.bills.some((b) => b.date === state.today) ? "编辑今日账单" : "记下今天"}</button><p class="balance-status">${state.bills.some((b) => b.date === state.today) ? "今天已记账" : "今天尚未记账"}<span> · </span>本月已记录 ${rows.length} 天</p></section><div class="ledger-layout"><section class="calendar"><div class="section-title"><h2>${y} 年 ${m} 月</h2><div class="month-nav"><button class="link" id="goToday">今天</button><button class="icon-btn" id="prevMonth" aria-label="上个月">‹</button><button class="icon-btn" id="nextMonth" aria-label="下个月" ${month >= state.today.slice(0, 7) ? "disabled" : ""}>›</button></div></div><div class="calendar-grid">${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<div class="weekday">${d}</div>`).join("")}${"<span></span>".repeat(offset)}${Array.from(
    { length: count },
    (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, "0")}`,
        b = rows.find((x) => x.date === date);
      return `<button class="day ${date === state.today ? "today" : ""} ${date === selected ? "selected" : ""}" data-date="${date}" ${date > state.today ? "disabled" : ""} aria-label="${date}${b ? "，利润" + signed(b.income - b.expense) : "，未记账"}"><span>${i + 1}</span><small class="${b && b.income < b.expense ? "loss" : ""}">${b ? signed(b.income - b.expense) : " "}</small></button>`;
    },
  ).join(
    "",
  )}</div></section><section class="detail"><div class="section-title"><h2>${selected === state.today ? "今天" : selected.slice(5).replace("-", " 月 ") + " 日"}</h2><button class="link" id="editBill">${bill ? "编辑" : "记账"} ›</button></div>${bill ? `<div class="money-row"><span>收入</span><strong>¥ ${money(bill.income)}</strong></div><div class="money-row"><span>支出</span><strong>¥ ${money(bill.expense)}</strong></div><div class="money-row profit"><span>利润</span><strong>${signed(bill.income - bill.expense)}</strong></div>${bill.note ? `<p class="note">${esc(bill.note)}</p>` : ""}` : `<div class="empty">还没有账单</div>`}<p class="bottom-note">利润按已记录的收入减支出计算。</p></section></div><section class="insight"><div class="section-title"><h2>经营洞察</h2><span class="quiet">${selected.slice(5).replace("-", " / ")}</span></div>${report?.summary ? `<p>${esc(report.summary)}</p><div class="report-time">${new Date(report.updated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 更新</div>` : report?.error ? `<p>${esc(report.error)}</p><button class="link" id="retryReport">重新分析 ›</button>` : bill ? `<p>账单已记下。<br><span>正在为你整理经营复盘。</span></p><button class="link" id="retryReport">查看分析 ›</button>` : `<p>先记一笔。<br><span>让经营建议，有据可依。</span></p>`}<button class="week" id="weekReport"><span>查看一周复盘</span>${icon("arrow")}</button></section>`;
  $("#addBill").onclick = () => editBill(state.today);
  $("#editBill").onclick = () => editBill(selected);
  $("#prevMonth").onclick = () => changeMonth(-1);
  $("#nextMonth").onclick = () => changeMonth(1);
  $("#goToday").onclick = () => {
    selected = state.today;
    month = selected.slice(0, 7);
    render();
  };
  document.querySelectorAll("[data-date]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.date;
        renderBills();
      }),
  );
  if ($("#retryReport")) $("#retryReport").onclick = () => runReport(selected);
  $("#weekReport").onclick = () => runReport(selected, true);
}
function changeMonth(n) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  selected = month === state.today.slice(0, 7) ? state.today : month + "-01";
  renderBills();
}
function editBill(date) {
  const b = state.bills.find((x) => x.date === date);
  showSheet(
    b ? "编辑这晚的账单" : "记下今晚",
    `<form id="billForm"><label class="form-row">营业日期<input type="date" name="date" value="${date}" max="${state.today}" min="2000-01-01" required ${b ? "readonly" : ""}></label><div class="form-grid"><label class="form-row">收入 · 元<input class="amount" name="income" type="number" inputmode="decimal" min="0" max="100000000" step=".01" placeholder="0.00" value="${b ? b.income / 100 : ""}" required></label><label class="form-row">支出 · 元<input class="amount" name="expense" type="number" inputmode="decimal" min="0" max="100000000" step=".01" placeholder="0.00" value="${b ? b.expense / 100 : ""}" required></label></div><label class="form-row">备注 · 选填<input name="note" maxlength="300" placeholder="比如：周末驻唱、采购补货" value="${esc(b?.note || "")}"></label><div class="form-profit"><span>当日利润</span><strong id="liveProfit">¥ ${b ? money(b.income - b.expense) : "0"}</strong></div><div class="form-error" role="alert"></div><button class="primary wide" type="submit">保存账单</button>${b ? '<button type="button" class="danger" id="deleteBill">删除这天的账单</button>' : ""}</form>`,
  );
  const f = $("#billForm");
  f.oninput = () =>
    ($("#liveProfit").textContent =
      "¥ " +
      money(
        Math.round((Number(f.income.value) - Number(f.expense.value)) * 100),
      ));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const submit = f.querySelector("[type=submit]");
    submit.disabled = true;
    try {
      const data = {
        date: f.date.value,
        income: Math.round(Number(f.income.value) * 100),
        expense: Math.round(Number(f.expense.value) * 100),
        note: f.note.value.trim(),
      };
      if (
        !b &&
        state.bills.some((x) => x.date === data.date) &&
        !confirm("这天已有账单，要替换为当前金额吗？")
      )
        return;
      await api("bills", "PUT", data);
      selected = data.date;
      month = selected.slice(0, 7);
      await sync();
      sheet.close();
      render();
      toast("账单已保存");
      pollReport(selected);
    } catch (e) {
      f.querySelector(".form-error").textContent = e.message;
    } finally {
      submit.disabled = false;
    }
  };
  if (b)
    $("#deleteBill").onclick = async () => {
      if (!confirm("确认删除这天的账单？此操作无法撤销。")) return;
      try {
        await api("bills", "DELETE", { date });
        await sync();
        sheet.close();
        render();
        toast("账单已删除");
      } catch (e) {
        f.querySelector(".form-error").textContent = e.message;
      }
    };
}
let pollTimer;
function pollReport(date) {
  clearTimeout(pollTimer);
  let count = 0;
  const poll = async () => {
    await sync();
    if (tab === "bill") renderBills();
    if (++count < 12 && !state.reports["report:" + date]?.summary)
      pollTimer = setTimeout(() => poll().catch(() => {}), 7000);
  };
  pollTimer = setTimeout(() => poll().catch(() => {}), 18000);
}
async function runReport(date, weekly = false) {
  if (weekly)
    showSheet(
      "近七天经营复盘",
      '<div class="loading">正在整理这周的生意…</div>',
    );
  else if ($("#retryReport")) {
    $("#retryReport").disabled = true;
    $("#retryReport").textContent = "分析中…";
  }
  try {
    const r = await api("report", "POST", { date, weekly });
    await sync();
    if (weekly) {
      showSheet(
        "近七天经营复盘",
        `<p class="eyebrow">截至 ${date}</p><div class="campaign-copy">${esc(r?.summary || r?.error || "这段时间还没有账单。先记下收支，再来看一周的变化。")}</div>`,
      );
    } else {
      renderBills();
    }
  } catch (e) {
    toast(e.message);
    if (weekly)
      showSheet("近七天经营复盘", `<p class="error-box">${esc(e.message)}</p>`);
    else renderBills();
  }
}
function renderActivities() {
  app.innerHTML = `<div class="page-top"><h1>活动</h1><button class="link" id="customIdea">新建活动 ＋</button></div><section class="editorial-hero"><p class="hero-kicker">下一场，玩点新的。</p><h2>今晚的热点。<br><span>明晚的主场。</span></h2><button class="primary" id="heroIdea">开始策划</button></section><section class="trend-list"><div class="section-title"><h2>值得关注</h2><span class="quiet" id="hotTime">正在同步</span></div><div id="hotList"><div class="loading">正在同步热榜…</div></div></section><section class="saved-section"><div class="section-title"><h2>已保存的活动</h2><span class="quiet">${state.campaigns.length} 场</span></div><div id="campaignList">${campaignList()}</div></section>`;
  $("#customIdea").onclick = customIdea;
  $("#heroIdea").onclick = customIdea;
  bindCampaigns();
  loadHot();
}
function campaignList() {
  return state.campaigns.length
    ? state.campaigns
        .map(
          (c) =>
            `<button class="campaign" data-campaign="${c.id}"><span style="flex:1"><strong>${esc(c.title)}</strong><small>${new Date(c.created).toLocaleDateString("zh-CN")} · 文案与清单已就绪</small></span>${icon("arrow")}</button>`,
        )
        .join("")
    : '<div class="empty">第一场好活动，从一个灵感开始。</div>';
}
function bindCampaigns() {
  document
    .querySelectorAll("[data-campaign]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openCampaign(
            state.campaigns.find((c) => c.id === b.dataset.campaign),
          )),
    );
}
async function loadHot() {
  try {
    if (!hotData) hotData = await api("hotspots");
    if (tab !== "activity") return;
    $("#hotTime").textContent =
      (hotData.stale ? "上次缓存 · " : "") +
      new Date(hotData.updated).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    const names = ["全部", ...new Set(hotData.items.map((x) => x.source))];
    $("#hotList").innerHTML =
      `<div class="tabs-small">${names.map((n) => `<button class="chip ${activeSource === n ? "active" : ""}" data-source="${n}">${n}</button>`).join("")}</div>${
        hotData.items
          .filter((x) => activeSource === "全部" || x.source === activeSource)
          .map(
            (x, i) =>
              `<div class="trend"><span class="trend-index">${String(i + 1).padStart(2, "0")}</span><div class="grow"><h3>${esc(x.title)}</h3><small>${esc(x.source)}${x.url ? ` · <a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">查看原话题 ↗</a>` : ""}</small></div><button class="icon-btn" data-hot="${x.id}" aria-label="围绕${esc(x.title)}策划活动">＋</button></div>`,
          )
          .join("") ||
        '<p class="empty">暂时没有筛选到适合酒吧的热点。可以直接选择活动主题。</p>'
      }<div class="source-row">${hotData.sources.map((s) => `<span class="source-pill ${s.ok ? "" : "off"}">${s.name} ${s.ok ? "✓" : "暂不可用"}</span>`).join("")}</div>`;
    document.querySelectorAll("[data-source]").forEach(
      (b) =>
        (b.onclick = () => {
          activeSource = b.dataset.source;
          loadHot();
        }),
    );
    document
      .querySelectorAll("[data-hot]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            generateCampaign(
              hotData.items.find((x) => x.id === b.dataset.hot).title,
            )),
      );
  } catch (e) {
    if ($("#hotList"))
      $("#hotList").innerHTML =
        `<div class="error-box">${esc(e.message)}<br><button class="link" id="retryHot">重试</button></div>`;
    if ($("#retryHot")) $("#retryHot").onclick = loadHot;
  }
}
function customIdea() {
  showSheet(
    "今晚，想来点什么？",
    `<div class="choice-grid">${["周末微醺音乐夜", "MBTI 同频交友局", "城市限定鸡尾酒", "无酒精也尽兴"].map((t) => `<button class="chip" data-theme="${t}">${t}</button>`).join("")}</div><form id="ideaForm"><label class="form-row">或者，你有一个想法<input name="title" placeholder="输入一个活动主题" maxlength="160" minlength="2" required></label><button class="primary wide">生成整套方案 ↗</button></form>`,
  );
  document
    .querySelectorAll("[data-theme]")
    .forEach((b) => (b.onclick = () => generateCampaign(b.dataset.theme)));
  $("#ideaForm").onsubmit = (e) => {
    e.preventDefault();
    generateCampaign(e.target.title.value);
  };
}
async function generateCampaign(title) {
  if (pendingCampaign) {
    toast("正在生成方案，请稍候");
    return;
  }
  pendingCampaign = true;
  showSheet(
    "灵感正在成形",
    `<p class="eyebrow">${esc(title)}</p><div class="loading">正在整理玩法、推广文案与执行清单…</div>`,
  );
  try {
    const c = await api("campaigns", "POST", { title });
    await sync();
    render();
    openCampaign(c);
  } catch (e) {
    showSheet(
      "这次没有生成成功",
      `<p class="error-box">${esc(e.message)}</p><button class="primary wide" id="retryCampaign">重新生成</button>`,
    );
    $("#retryCampaign").onclick = () => generateCampaign(title);
  } finally {
    pendingCampaign = false;
  }
}
function openCampaign(c) {
  if (!c) return;
  const d = c.content;
  showSheet(
    c.title,
    `<p class="eyebrow">活动方案</p><p class="campaign-copy">${esc(d.concept)}</p>${[
      ["social", "朋友圈文案"],
      ["creator", "博主推广文案"],
    ]
      .map(
        ([k, t]) =>
          `<div class="copy-head"><h3>${t}</h3><button class="link" data-copy="${k}">复制 ↗</button></div><p class="campaign-copy">${esc(d[k])}</p>`,
      )
      .join(
        "",
      )}<div class="copy-head"><h3>执行清单</h3></div>${d.checklist.map((t, i) => `<label class="check-item"><input type="checkbox" data-check="${i}" ${localStorage.getItem(c.id + ":" + i) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}<div class="poster"><small>今夜相聚</small><h3>${esc(d.poster)}</h3><div class="poster-bottom">${esc(state.settings.name)}<br>相聚，就在今晚。<br><small>18+ · 理性饮酒</small></div></div><button class="primary wide" id="downloadPoster" style="margin-top:16px">保存宣传海报 ↓</button>`,
  );
  document.querySelectorAll("[data-copy]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(d[b.dataset.copy]);
          toast("文案已复制");
        } catch {
          toast("复制失败，请长按文案复制");
        }
      }),
  );
  document.querySelectorAll("[data-check]").forEach(
    (b) =>
      (b.onchange = () => {
        const k = c.id + ":" + b.dataset.check;
        if (b.checked) localStorage.setItem(k, "1");
        else localStorage.removeItem(k);
      }),
  );
  $("#downloadPoster").onclick = () => downloadPoster(d.poster);
}
function downloadPoster(title) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const c = canvas.getContext("2d");
  c.fillStyle = "#161619";
  c.fillRect(0, 0, 1080, 1440);
  c.strokeStyle = "#ffffff18";
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.arc(890, 530, 250 + i * 45, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = "#f5f5f7";
  c.font = "24px sans-serif";
  c.fillText("今夜相聚", 90, 130);
  c.font = "bold 105px sans-serif";
  let line = "",
    y = 390;
  for (const ch of title) {
    if (c.measureText(line + ch).width > 850) {
      c.fillText(line, 90, y);
      line = "";
      y += 145;
    }
    line += ch;
  }
  c.fillText(line, 90, y);
  c.font = "38px sans-serif";
  c.fillText(state.settings.name, 90, 1210);
  c.font = "25px sans-serif";
  c.fillText("相聚，就在今晚。", 90, 1270);
  c.fillText("18+ · 理性饮酒", 90, 1350);
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = title + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("海报已导出");
  });
}
function renderMarketing() {
  app.innerHTML = `<div class="page-top"><h1>营销</h1><button class="link" id="newMarketing">创建 ＋</button></div><section class="marketing-hero"><div class="marketing-title"><p class="hero-kicker">文案。海报。一次就绪。</p><h2>好夜晚，<br>自带吸引力。</h2><button class="primary" id="heroMarketing">制作推广内容</button></div><div class="poster-stage" aria-hidden="true"><div class="poster-pair"><div class="poster-object back"><span>周末</span><strong>留点时间<br>给自己。</strong><small>21:00 — LATE</small></div><div class="poster-object front"><span>今夜</span><strong>不赶时间。</strong><div class="poster-disc"></div><small>音乐 · 相聚 · 微醺</small></div></div></div></section><section class="saved-section"><div class="section-title"><h2>你的素材</h2><span class="quiet">${state.campaigns.length} 套</span></div>${campaignList()}</section>`;
  $("#newMarketing").onclick = customIdea;
  $("#heroMarketing").onclick = customIdea;
  bindCampaigns();
}
const drinkVisual = () =>
  `<svg class="drink-visual" viewBox="0 0 360 400" aria-hidden="true"><defs><linearGradient id="glass" x1="0" x2="1"><stop stop-color="#ddd" stop-opacity=".1"/><stop offset=".17" stop-color="white" stop-opacity=".8"/><stop offset=".35" stop-color="#aaa" stop-opacity=".1"/><stop offset=".8" stop-color="white" stop-opacity=".8"/><stop offset="1" stop-color="#777" stop-opacity=".3"/></linearGradient><linearGradient id="liquid" x1="0" x2=".8" y2="1"><stop stop-color="#e9aa52" stop-opacity=".7"/><stop offset="1" stop-color="#af450c" stop-opacity=".95"/></linearGradient><radialGradient id="shadow"><stop stop-color="#111" stop-opacity=".18"/><stop offset="1" stop-color="#111" stop-opacity="0"/></radialGradient></defs><ellipse cx="180" cy="365" rx="110" ry="17" fill="url(#shadow)"/><path d="M179 220v126q-2 11-55 13q-12 6 56 7q68-1 56-7q-53-2-55-13V220" fill="url(#glass)" stroke="#aaa" stroke-width=".8"/><path d="M80 85q0 135 100 143q100-8 100-143z" fill="url(#glass)" stroke="#aaa" stroke-width=".8"/><path d="M89 128q17 86 91 93q74-7 91-93z" fill="url(#liquid)"/><ellipse cx="180" cy="128" rx="91" ry="12" fill="#e8b263" opacity=".8"/><path d="M80 85q0 135 100 143q100-8 100-143" fill="none" stroke="white" stroke-width="3" opacity=".8"/><ellipse cx="180" cy="85" rx="100" ry="15" fill="none" stroke="#ccc" stroke-width="1.5"/><path d="m130 119 32-8 13 32-32 9zM188 118l32-4 6 36-32 2z" fill="white" fill-opacity=".28" stroke="white" stroke-opacity=".5"/><circle cx="250" cy="95" r="34" fill="#df8d25"/><circle cx="250" cy="95" r="29" fill="#f4cc83"/><circle cx="250" cy="95" r="26" fill="#edb45d"/><path d="M250 69v52m-26-26h52m-44-18 36 36m-36 0 36-36" stroke="#ffe5b4" stroke-width="2"/><path d="M104 105q4 65 37 89" fill="none" stroke="white" stroke-width="3" opacity=".75"/></svg>`;
function renderGames() {
  app.innerHTML = `<div class="page-top"><h1>游戏</h1><span>为相聚加点乐趣</span></div><section class="game-hero"><p class="hero-kicker">今晚的专属一杯</p><h2>懂你的心情。<br><span>也懂你的口味。</span></h2><button class="primary" id="startMatch">找到我的一杯</button>${drinkVisual()}</section><section class="game-options"><button id="icebreaker"><span><small>同频破冰卡</small><strong>从一句话，<br>到聊得来。</strong></span><span class="round-plus" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span></button><button id="gamePlan"><span><small>门店专属玩法</small><strong>好玩的下一场，<br>你来定义。</strong></span><span class="round-plus" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span></button></section><p class="bottom-note">18 岁以上 · 支持无酒精选择 · 酒款匹配仅供趣味参考</p>`;
  $("#startMatch").onclick = matchGame;
  $("#icebreaker").onclick = icebreaker;
  $("#gamePlan").onclick = () =>
    generateCampaign(
      "酒吧同频破冰小游戏：自愿参与、无拼酒，不以饮酒量奖励，参与可选无酒精饮品或小食，设每人每日限次与成本上限",
    );
}
function matchGame() {
  let personality = "INFP",
    mood = "放松一下",
    taste = "清爽果香",
    alcohol = "低酒精";
  const mbtis = [
    "INFP",
    "INFJ",
    "INTP",
    "INTJ",
    "ISFP",
    "ISFJ",
    "ISTP",
    "ISTJ",
    "ENFP",
    "ENFJ",
    "ENTP",
    "ENTJ",
    "ESFP",
    "ESFJ",
    "ESTP",
    "ESTJ",
  ];
  showSheet(
    "找到今晚的专属一杯",
    `<form id="matchForm"><label class="form-row">你的 MBTI<select name="mbti">${mbtis.map((x) => `<option>${x}</option>`).join("")}</select></label><p class="form-row">今晚的心情</p><div class="choice-grid">${["放松一下", "想交朋友", "庆祝一下", "安静独处"].map((v, i) => `<button type="button" class="chip ${!i ? "active" : ""}" data-mood="${v}">${v}</button>`).join("")}</div><div class="form-grid"><label class="form-row">喜欢的风味<select name="taste"><option>清爽果香</option><option>酸甜柑橘</option><option>苦甜草本</option></select></label><label class="form-row">酒精偏好<select name="alcohol"><option>低酒精</option><option>无酒精</option></select></label></div><button class="primary wide">揭晓我的一杯 ✦</button></form><p class="privacy-note">MBTI 只是趣味线索，推荐更看重你的口味。结果不保存个人资料。</p>`,
  );
  document.querySelectorAll("[data-mood]").forEach(
    (b) =>
      (b.onclick = () => {
        mood = b.dataset.mood;
        document
          .querySelectorAll("[data-mood]")
          .forEach((x) => x.classList.toggle("active", x === b));
      }),
  );
  $("#matchForm").onsubmit = (e) => {
    e.preventDefault();
    personality = e.target.mbti.value;
    taste = e.target.taste.value;
    alcohol = e.target.alcohol.value;
    const choices = {
      清爽果香: ["白桃气泡 Spritz", "白桃乌龙气泡"],
      酸甜柑橘: ["低度柚子 Spritz", "柚子迷迭香苏打"],
      苦甜草本: ["低度草本 Spritz", "无醇汤力特调"],
    };
    const name = choices[taste][alcohol === "无酒精" ? 1 : 0];
    showSheet(
      "今晚，就喝这一杯",
      `<div class="game-result"><p class="eyebrow">${personality} · ${mood}</p><h3>${name}</h3><p>${taste}，${alcohol === "无酒精" ? "零酒精也有完整的仪式感" : "轻盈的低度配方，慢慢享用"}。<br>${mood === "想交朋友" ? "带着这杯，向旁边的人说声嗨。" : mood === "庆祝一下" ? "为今天值得记住的小事，举杯。" : "把今天的忙碌，留在杯子之外。"}</p><button class="primary wide" id="showBartender">给调酒师看</button><p class="privacy-note">实际配方、酒精度及价格以门店为准。</p></div>`,
    );
    $("#showBartender").onclick = () =>
      showSheet(
        "我的点单卡",
        `<div class="game-result"><p class="eyebrow">请调酒师确认出品与价格</p><h3>${name}</h3><p>${taste} · ${alcohol}<br>${mood}</p><p class="privacy-note">点单卡仅供现场沟通，未自动下单。</p></div>`,
      );
  };
}
function icebreaker() {
  const prompts = [
    "最近一首让你单曲循环的歌是什么？",
    "如果给今天取一个电影名字，你会选什么？",
    "推荐一个这座城市只有你知道的小角落。",
    "如果今晚可以瞬移，你想去哪座城市？",
    "说一件最近让你觉得「生活还不错」的小事。",
  ];
  showSheet(
    "今晚的同频破冰卡",
    `<div class="game-result"><p class="eyebrow">同频破冰卡</p><h3 style="font-size:25px;line-height:1.7">${prompts[Math.floor(Math.random() * prompts.length)]}</h3><p>每人分享一个答案，也可以跳过。<br>门店可提供一份小食或无酒精试饮作为参与奖励。<br>建议每人每晚限一次，开场前确认奖励与预算。</p><button class="primary" id="anotherCard">再抽一张 ↗</button></div>`,
  );
  $("#anotherCard").onclick = icebreaker;
}
$("#storeButton").onclick = () => {
  const s = state.settings;
  showSheet(
    "你的酒吧",
    `<form id="storeForm"><label class="form-row">门店名称<input name="storeName" value="${esc(s.name)}" maxlength="30" required></label><div class="form-grid"><label class="form-row">总投资 · 元<input type="number" name="investment" min="0" max="10000000000" step=".01" value="${s.investment}"></label><label class="form-row">目标回本 · 月<input type="number" name="months" min="1" max="120" value="${s.months}" required></label></div><p class="note">选填投资额，让经营复盘更贴近你的目标。</p><div class="form-error" role="alert"></div><button class="primary wide">保存</button></form>`,
  );
  $("#storeForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api("settings", "PUT", {
        name: f.storeName.value.trim(),
        investment: Number(f.investment.value),
        months: Number(f.months.value),
      });
      await sync();
      sheet.close();
      render();
      toast("门店信息已更新");
    } catch (e) {
      f.querySelector(".form-error").textContent = e.message;
    }
  };
};
try {
  await sync();
  selected = state.today;
  month = selected.slice(0, 7);
  render();
} catch (e) {
  app.innerHTML = `<div class="error-box">${esc(e.message)}。请检查本地服务是否运行，然后刷新页面。</div>`;
}
