import "./vendor/rolling-number/styles.css";
import "./style.css";
import { createRollingNumber } from "./vendor/rolling-number/index.js";
import { ScrubTitle } from "./shared/scrub-title";
import { MetalScene } from "./scene";
import {
  categories,
  recordAt,
  records,
  wrap,
  columnCount,
  setReports,
  adapt,
} from "./data";
import type { Report, BridgeMessage } from "../../shared/contracts";

const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${({ search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>', arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6h5"/>', bell: '<path d="M6 10a6 6 0 0 1 12 0v6l2 2H4l2-2Zm4 11h4"/>', user: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="9" r="3"/><path d="M5 19c1-6 13-6 14 0"/>', grid: '<path stroke-dasharray="2 3" stroke-width="3" d="M4 5h16M4 12h16M4 19h16"/>' } as Record<string, string>)[name] ?? ""}</svg>`;
const map = `<svg viewBox="0 0 310 160" class="world-map" aria-hidden="true"><defs><pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".85" fill="#79b7da"/></pattern></defs><g fill="url(#dots)"><path d="m14 30 24-15 26 3 11-10 35 3-7 15-21 3-5 16-15 5-3 21-16 2-9-18-18-8Z"/><path d="m61 73 25 5 14 20-5 21-15 31-9-15 2-24-12-17Z"/><path d="m127 30 16-17 22 4 15-7 30 6 17-3 60 18-4 13-24 8-17 25-23-7-12 16-12-29-19-8-14 14-16-9-6-15Z"/><path d="m143 60 24 2 17 22-13 29-15 11-12-23-9-28Z"/><path d="m239 113 24-9 24 13 2 18-26 3-16-13Z"/><path d="m114 4 14-3-5 15-13 2Zm98 76 9 9 10 5-4 8-13-9Zm-23 32 4-9 4 17-8 8Z"/></g></svg>`;
$("#stage").innerHTML = `
 <div id="scene"></div><div class="atmosphere"></div><div class="frame-line"></div>
 <section class="hero" aria-label="Archive Lab"><p class="overline">SYNTHESIZE INFORMATION</p><h1>ARCHIVE LAB<span>ANALYSIS <b>OS</b></span></h1><i></i><p class="principles">PEOPLE　 DATA　 CONTEXT　 INSIGHT</p></section>
 <nav class="utility"><button data-action="search">${icon("search")} ARCHIVE INDEX <kbd>/</kbd></button><span class="divider"></span><button data-action="saved">SAVED <span id="saved-count">00</span></button><span class="divider"></span><button data-action="activity" aria-label="最近浏览">${icon("clock")}</button><span class="divider"></span><button data-action="settings" aria-label="档案显示设置" title="显示设置">${icon("grid")}</button></nav>
 <aside class="manifesto"><i></i><p>A CENTRAL ARCHIVE<br>FOR A MORE<br>CONNECTED WORLD.</p><i></i><p>CLASSIFY<br>RESEARCH<br>PRESERVE<br>ENABLE</p></aside>
 <aside class="mission"><p>KNOWLEDGE<br>PRESERVES<br>PERSPECTIVE.</p><i></i><p>A MORE<br>INFORMED<br>TOMORROW</p></aside>
 <section class="file-callout" aria-live="polite"><p class="eyebrow">INTERNAL DATABASE <span>/</span><i></i> <span id="eyebrow-category">RESEARCH ARCHIVE</span></p>
 <button class="file-number" data-action="open">FILE NUMBER: <span id="code">002</span></button><div class="long-rule"><i></i></div>
 <div class="file-meta"><h2 id="file-title">Structural Boundaries</h2><span>REFERENCE AREA <i></i></span></div><p id="file-subtitle">Classification, Containment and Long-Term Preservation</p>
 <button class="access" data-action="open"><span class="circle-arrow">${icon("arrow")}</span><strong>ACCESS FILE</strong>${icon("arrow")}</button></section>
 <aside class="network">${map}<p>GLOBAL KNOWLEDGE NETWORK <i></i></p></aside>
 <section class="browse-controls"><div class="counter"><p>ARCHIVE : SELECT</p><div><span id="number">01</span><small>/　08</small></div></div>
 <div class="row-control"><button data-action="prev" aria-label="上一份档案">‹</button><div id="ticks" aria-label="选择档案"></div><button data-action="next" aria-label="下一份档案">›</button><p>↑ ↓ BROWSE ARCHIVES</p></div>
 <div class="column-control"><p>COLUMN <span id="column">01</span> / 05</p><div><button data-action="column-prev" aria-label="上一列">‹</button><strong id="category">RESEARCH</strong><button data-action="column-next" aria-label="下一列">›</button></div><small>← → SWITCH COLLECTION</small></div></section>
 <nav class="bottom-tabs"><button data-tab="overview">OVERVIEW</button><span>/</span><button data-tab="documents">DOCUMENTS</button><span>/</span><button data-tab="related">RELATED</button><span>/</span><button data-tab="analysis">ANALYSIS</button></nav>
 <footer><p><i></i> SESSION AUTHORIZED</p><p>INTELLIGENCE FOR A SAFER TOMORROW <i></i></p></footer>
 <section id="detail" hidden><button class="back" data-action="back">← <span>ARCHIVE OVERVIEW</span><kbd>ESC</kbd></button><div class="model-caption"><span id="model-code"></span><p id="drag-hint">LIFTING ARCHIVE…</p><button data-action="viewer">360° OBJECT STUDY ${icon("arrow")}</button></div>
 <article id="detail-content"><p class="eyebrow">RESEARCH ARCHIVE / <span id="detail-code"></span></p><h2 id="detail-title"></h2><p id="detail-subtitle"></p><nav class="detail-tabs"><button data-tab="overview" class="active">OVERVIEW</button><button data-tab="documents">DOCUMENTS</button><button data-tab="related">RELATED</button><button data-tab="analysis">ANALYSIS</button></nav><div id="detail-body"></div><div class="detail-actions"><button data-action="save" id="save-button">＋ SAVE ARCHIVE</button><button data-action="export">EXPORT ↗</button></div><p class="record-note">ARCHIVE LAB / DEMONSTRATION COLLECTION</p></article></section>
 <div id="hover" hidden></div><div id="loading"><img src="/report-archive/brand/archive-logo.svg" alt=""><p>CONNECTING TO THE ARCHIVE</p><span>PREPARING REPORT COLLECTION</span></div><div id="toast" role="status"></div>`;

document.body.insertAdjacentHTML(
  "beforeend",
  `<dialog id="panel"><div class="panel-head"><div><p>ARCHIVE LAB / INTERNAL DATABASE</p><h2 id="panel-title"></h2></div><button data-close aria-label="关闭">✕</button></div><div id="panel-content"></div></dialog>`,
);
const panel = $<HTMLDialogElement>("#panel");
const safeRead = <T>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const saved = new Set(safeRead<unknown[]>("gotham-report-saved", []).filter((id):id is string=>typeof id==='string'));
const prefs = safeRead("gotham-report-prefs", {
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  quality: true,
});
function readSession() {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("gotham-report-session") ?? "null",
    );
    if (
      value &&
      Number.isSafeInteger(value.lane) &&
      Number.isSafeInteger(value.row) &&
      Array.isArray(value.memory) &&
      value.memory.length === 5 &&
      value.memory.every(Number.isSafeInteger)
    )
      return value;
  } catch {
    /* A new workspace can still open when session storage is unavailable. */
  }
  return {
    lane: 0,
    row: 0,
    memory: [0, 0, 0, 0, 0],
    detail: false,
    tab: "overview",
  };
}
const previous = readSession();
let lane = previous.lane as number,
  row = previous.row as number,
  detail = false,
  tab = "overview",
  lastOpener: HTMLElement | null = null;
const memory: number[] = [...previous.memory],
  history: string[] = [];
const options = {
  locales: "en-US",
  format: { minimumIntegerDigits: 2, useGrouping: false },
  duration: 460,
  motionBlur: true,
  animated: !prefs.reduced,
};
const number = createRollingNumber($("#number"), { ...options, value: 1 });
const column = createRollingNumber($("#column"), { ...options, value: 1 });
const title = new ScrubTitle($("#file-title"));
let scene: MetalScene;
let selectedVersion: Report | undefined;
let reportVersions: Report[] = [];
let bridgeReady = false;
let requestedDetail = false;
const bridgePending = new Map<string, ReturnType<typeof setTimeout>>();
let viewer: import("./viewer").ObjectViewer | undefined;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(text: string) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2400);
}
function persist() {
  try {
    localStorage.setItem("gotham-report-saved", JSON.stringify([...saved]));
    localStorage.setItem("gotham-report-prefs", JSON.stringify(prefs));
  } catch {
    toast("浏览器未允许保存偏好；本次会话仍可使用。");
  }
}
function selection() {
  const item = recordAt(lane, row);
  number.update({
    value: item.id ? item.index + 1 : 0,
    animated: !prefs.reduced,
  });
  column.update({ value: item.column + 1, animated: !prefs.reduced });
  $("#code").textContent = item.code;
  $(".counter small").textContent =
    "/ " + String(columnCount(lane)).padStart(2, "0");
  $(".access").toggleAttribute("disabled", !item.id);
  title.update(item.title, !detail && !prefs.reduced);
  $("#category").textContent = item.category;
  $("#eyebrow-category").textContent = item.category + " ARCHIVE";
  $("#file-subtitle").textContent = item.subtitle;
  $("#saved-count").textContent = String(records.filter(r=>saved.has(r.id)).length).padStart(2, "0");
  $("#ticks").innerHTML = Array.from(
    { length: Math.min(8, columnCount(lane) - Math.floor(item.index / 8) * 8) },
    (_, slot) => {
      const i = Math.floor(item.index / 8) * 8 + slot;
      return `<button class="${i === item.index ? "active" : ""}" data-index="${i}" aria-label="第 ${i + 1} 份档案" aria-pressed="${i === item.index}"><i></i></button>`;
    },
  ).join("");
  if (detail) renderDetail();
}
function select(nextLane: number, nextRow: number) {
  lane = nextLane;
  row = nextRow;
  memory[wrap(lane, 5)] = row;
  scene?.select({ lane, row });
  selectedVersion = undefined;
  if (detail && !recordAt(lane, row).id) back();
  selection();
  scene?.refreshLabels();
  if (recordAt(lane, row).id)
    sendBridge("SELECT_REPORT", {
      id: recordAt(lane, row).id,
      openDetail: detail,
    });
  rememberSession();
}
function rememberSession() {
  try {
    sessionStorage.setItem(
      "gotham-report-session",
      JSON.stringify({
        lane,
        row,
        memory,
        detail,
        tab,
        reportId: recordAt(lane, row).id,
        version: selectedVersion?.version,
      }),
    );
  } catch {
    /* Keep the current session usable. */
  }
}
function move(axis: "row" | "lane", delta: number) {
  if (axis === "row") select(lane, row + delta);
  else {
    const next = lane + delta;
    select(next, memory[wrap(next, 5)]);
  }
}
function openDetail(nextTab = "overview") {
  if (!scene || !recordAt(lane, row).id) return;
  lastOpener = document.activeElement as HTMLElement;
  detail = true;
  tab = nextTab;
  $("#detail").hidden = false;
  $("#stage").dataset.mode = "detail";
  scene.setDetail(true);
  title.reset();
  const id = recordAt(lane, row).id;
  if (history.at(-1) !== id) history.push(id);
  renderDetail();
  sendBridge("SELECT_REPORT", {
    id,
    version: selectedVersion?.id === id ? selectedVersion.version : undefined,
  });
  $("#hover").hidden = true;
  $("#detail .back").focus({ preventScroll: true });
  rememberSession();
}
function back() {
  detail = false;
  scene?.setDetail(false);
  $("#stage").dataset.mode = "archive";
  $("#detail").hidden = true;
  lastOpener?.focus({ preventScroll: true });
  selection();
  rememberSession();
  if (recordAt(lane, row).id)
    sendBridge("SELECT_REPORT", {
      id: recordAt(lane, row).id,
      version: selectedVersion?.version,
      openDetail: false,
    });
}
function renderDetail() {
  rememberSession();
  const r = recordAt(lane, row);
  if (!r.id) return;
  $("#detail-code").textContent = r.code;
  $("#model-code").textContent = r.code + " / INTERNAL DATABASE";
  $("#detail-title").textContent = r.title;
  $("#detail-subtitle").textContent = r.subtitle;
  document
    .querySelectorAll(".detail-tabs button")
    .forEach((b) =>
      b.classList.toggle("active", (b as HTMLElement).dataset.tab === tab),
    );
  renderBusinessDetail(r);
  $("#save-button").textContent = saved.has(r.id)
    ? "✓ SAVED"
    : "＋ SAVE ARCHIVE";
}
function showPanel(name: string) {
  $("#panel-title").textContent = name;
  panel.showModal();
}
function resultButtons(items: typeof records) {
  return items.length
    ? items
        .map(
          (r) =>
            `<button class="result" data-record="${r.id}"><span>${r.code}<small>${r.category}</small></span><strong>${r.title}</strong><i>↗</i></button>`,
        )
        .join("")
    : '<p class="empty">No records found. Try a different keyword.</p>';
}
function search() {
  showPanel("Archive index");
  $("#panel-content").innerHTML =
    `<label class="search-input">${icon("search")}<input id="query" placeholder="Search title, file number, or collection…" autocomplete="off"></label><div class="filters"><button data-filter="all" class="active">ALL / ${records.length}</button>${categories.map((s, i) => `<button data-filter="${i}">${s}</button>`).join("")}</div><div id="results">${resultButtons(records)}</div>`;
  let filter = "all";
  const update = () => {
    const q = $<HTMLInputElement>("#query").value.toLowerCase().trim();
    $("#results").innerHTML = resultButtons(
      records.filter(
        (r) =>
          (filter === "all" || r.column === Number(filter)) &&
          [r.title, r.code, r.category].join(" ").toLowerCase().includes(q),
      ),
    );
  };
  $("#query").addEventListener("input", update);
  $("#panel-content .filters").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-filter]");
    if (!b) return;
    filter = b.dataset.filter!;
    $("#panel-content .filters .active")?.classList.remove("active");
    b.classList.add("active");
    update();
  });
  $("#query").focus();
}
async function action(name: string) {
  if (name === "prev") move("row", -1);
  if (name === "next") move("row", 1);
  if (name === "column-prev") move("lane", -1);
  if (name === "column-next") move("lane", 1);
  if (name === "open") openDetail();
  if (name === "back") back();
  if (name === "search") search();
  if (name === "save") {
    const r = recordAt(lane, row);
    if (!r.id) return;
    saved.has(r.id) ? saved.delete(r.id) : saved.add(r.id);
    persist();
    selection();
  }
  if (name === "saved") {
    showPanel("Saved archives");
    $("#panel-content").innerHTML = saved.size
      ? resultButtons(records.filter((r) => saved.has(r.id)))
      : '<p class="empty">Your collection starts here.<br>Open a file and choose SAVE ARCHIVE.</p>';
  }
  if (name === "activity") {
    showPanel("Recently accessed");
    $("#panel-content").innerHTML = history.length
      ? resultButtons(records.filter((r) => history.includes(r.id)))
      : '<p class="empty">No files accessed in this session yet.</p>';
  }
  if (name === "settings") {
    showPanel("Display preferences");
    $("#panel-content").innerHTML =
      `<label class="setting"><span>Reduced motion<small>简化镜头与界面过渡</small></span><input type="checkbox" id="reduced" ${prefs.reduced ? "checked" : ""}></label><label class="setting"><span>Depth of field<small>景深与高分辨率渲染</small></span><input type="checkbox" id="quality" ${prefs.quality ? "checked" : ""}></label><p class="settings-note">← → 切换列 · ↑ ↓ 翻阅档案 · Enter 打开 · Esc 返回<br>详情模型获得净空后可以拖动旋转。</p>`;
    for (const id of ["reduced", "quality"] as const)
      $("#" + id).addEventListener("change", () => {
        prefs[id] = $<HTMLInputElement>("#" + id).checked;
        scene.setPreferences(prefs.reduced, prefs.quality);
        $("#stage").classList.toggle("reduced", prefs.reduced);
        persist();
        selection();
      });
  }
  if (name === "export") {
    const r = recordAt(lane, row);
    sendBridge("EXPORT_REPORT", { id: r.id, version: activeReport(r).version });
  }
  if (name === "viewer") {
    if (!recordAt(lane, row).id) return;
    try {
      viewer ??= new (await import("./viewer")).ObjectViewer();
      await viewer.open(recordAt(lane, row), prefs.reduced);
    } catch (error) {
      console.error(error);
      toast("模型未能载入，请重试。");
    }
  }
}
document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!el) return;
  if (el.hasAttribute("data-close")) panel.close();
  if (el.dataset.action) void action(el.dataset.action);
  if (el.dataset.tab) {
    tab = el.dataset.tab;
    if (!detail) openDetail(tab);
    else renderDetail();
  }
  if (el.dataset.index !== undefined) {
    const index = Number(el.dataset.index),
      delta = index - wrap(row, columnCount(lane));
    select(lane, row + delta);
  }
  if (el.dataset.record !== undefined) {
    const r = records.find((r) => r.id === el.dataset.record);
    if (!r) return;
    const nextLane = r.column + Math.round((lane - r.column) / 5) * 5;
    const nextRow = r.index;
    select(nextLane, nextRow);
    if (panel.open) panel.close();
    if (detail) renderDetail();
  }
});
panel.addEventListener("click", (e) => {
  if (e.target === panel) {
    const r = panel.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      panel.close();
  }
});
document.addEventListener("keydown", (e) => {
  if (viewer?.isOpen) return;
  if (panel.open) return;
  if (
    ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") ||
    e.key === "/"
  ) {
    e.preventDefault();
    search();
    return;
  }
  if ((e.target as HTMLElement).matches("input,textarea,select")) return;
  if (e.key === "Escape" && detail) {
    e.preventDefault();
    back();
  }
  if (e.key === "Enter" && !(e.target as HTMLElement).closest("button,a")) {
    e.preventDefault();
    if (!detail) openDetail();
  }
  const moves: Record<string, ["lane" | "row", number]> = {
    ArrowLeft: ["lane", -1],
    ArrowRight: ["lane", 1],
    ArrowUp: ["row", -1],
    ArrowDown: ["row", 1],
  };
  if (moves[e.key]) {
    e.preventDefault();
    move(...moves[e.key]);
  }
});
function activeReport(r: ReturnType<typeof recordAt>) {
  return selectedVersion?.id === r.id ? selectedVersion : r.report;
}
const escapeHTML = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function sendBridge(type: string, payload: unknown = {}) {
  const requestId = crypto.randomUUID();
  if (type !== "READY") {
    if (type === "SIMULATE_PUSH" && bridgePending.size) return;
    bridgePending.set(
      requestId,
      setTimeout(() => {
        bridgePending.delete(requestId);
        toast("请求超时，请重试");
        renderDetail();
      }, 15000),
    );
  }
  parent.postMessage(
    { protocol: "gotham-report", version: 1, type, requestId, payload },
    location.origin,
  );
}
function renderBusinessDetail(r: ReturnType<typeof recordAt>) {
  const report = activeReport(r);
  if (!report) return;
  const h = escapeHTML;
  const versionOptions = reportVersions.filter((v) => v.id === r.id);
  const head = `<div class="record-facts"><span>VERSION<select id="report-version" aria-label="报告版本">${(versionOptions.length ? versionOptions : [report]).map((v) => `<option value="${v.version}" ${v.version === report.version ? "selected" : ""}>v${v.version}</option>`).join("")}</select></span><span>AMOUNT<strong>¥${(report.amountCents / 100).toLocaleString("zh-CN")}</strong></span><span>DEMONSTRATION<strong>模拟数据</strong></span></div>`;
  let body = "";
  if (tab === "overview")
    body = `<h3>${h(report.conclusion)}</h3><p>${h(report.decision)} · 模拟置信度 ${report.confidence}%</p>${report.type === "business" ? `<p>${report.units} 台／套 · ${h(report.delivery)} · ${report.finance ? "融资方案" : "标准方案"}（演示）</p><button data-business="push" ${report.sent || bridgePending.size ? "disabled" : ""}>${report.sent ? "已模拟推送" : "模拟推送销售团队"}</button>` : "<p>依据设备遥测和维修记录的预置案例生成，不调用真实诊断服务。</p>"}`;
  else if (tab === "analysis")
    body = report.evidence
      .map(
        (e, i) =>
          `<div class="finding"><span>0${i + 1}</span><p>${h(e)}</p></div>`,
      )
      .join("");
  else if (tab === "documents")
    body = `<h3>来源文档</h3>${report.evidenceIds.map((id) => `<p>${h(id)}</p>`).join("")}<button data-business="documents">打开设备资料库 ↗</button>`;
  else
    body = `<h3>报告依据链</h3>${report.sourceId ? `<button data-source-report="${h(report.sourceId)}" data-source-version="${report.sourceVersion}">${h(report.sourceId)} v${report.sourceVersion} ↗</button>` : "<p>此报告直接引用设备与维修证据。</p>"}`;
  $("#detail-body").innerHTML =
    head +
    body +
    `<div class="detail-actions"><button data-business="equipment">返回来源设备 · ${h(report.equipmentId)} ↗</button></div>`;
  $("#detail-title").textContent = report.title;
  $("#detail-subtitle").textContent =
    `${report.equipmentId} · v${report.version} · 演示模拟数据`;
  $("#report-version").addEventListener("change", (e) =>
    sendBridge("SELECT_REPORT", {
      id: r.id,
      version: Number((e.target as HTMLSelectElement).value),
    }),
  );
}
document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-business],[data-source-report]",
  );
  if (!el) return;
  const report = activeReport(recordAt(lane, row));
  if (!report) return;
  if (el.dataset.sourceReport)
    sendBridge("SELECT_REPORT", {
      id: el.dataset.sourceReport,
      version: Number(el.dataset.sourceVersion),
    });
  if (el.dataset.business === "equipment")
    sendBridge("OPEN_EQUIPMENT", { id: report.equipmentId });
  if (el.dataset.business === "documents")
    sendBridge("OPEN_DOCUMENTS", { id: report.equipmentId });
  if (el.dataset.business === "push") {
    if (confirm("仅记录本地模拟推送，确认继续？")) {
      sendBridge("SIMULATE_PUSH", { id: report.id, version: report.version });
      renderDetail();
    }
  }
});
window.addEventListener("message", (e: MessageEvent<BridgeMessage>) => {
  const m = e.data;
  if (
    e.origin !== location.origin ||
    e.source !== parent ||
    m?.protocol !== "gotham-report" ||
    m.version !== 1 ||
    typeof m.requestId !== "string"
  )
    return;
  const timer = bridgePending.get(m.requestId);
  if (timer) {
    clearTimeout(timer);
    bridgePending.delete(m.requestId);
  }
  if (m.type === "SNAPSHOT") {
    if (!Array.isArray(m.payload?.reports)) return;
    bridgeReady = true;
    requestedDetail = m.payload.openDetail !== false;
    const selectedId = recordAt(lane, row).id || previous.reportId;
    setReports(m.payload.reports);
    selectedVersion = m.payload.selected;
    reportVersions = m.payload.versions ?? [];
    const target =
      records.find((r) => r.id === (selectedVersion?.id ?? selectedId)) ??
      records[0];
    if (target) {
      lane = target.column;
      row = target.index;
      scene?.select({ lane, row });
    } else if (detail) back();
    scene?.refreshLabels();
    selection();
    if (selectedVersion && requestedDetail && scene && !detail) {
      detail = true;
      tab = "overview";
      $("#detail").hidden = false;
      $("#stage").dataset.mode = "detail";
      scene.setDetail(true);
      renderDetail();
    }
    rememberSession();
  } else if (m.type === "ERROR" || m.type === "RESULT") {
    if (m.payload?.message) toast(m.payload.message);
    if (detail) renderDetail();
  }
});
const readyTimer = setInterval(() => {
  if (bridgeReady) clearInterval(readyTimer);
  else sendBridge("READY");
}, 1000);
sendBridge("READY");
function resize() {
  const scale = Math.min(innerWidth / 1920, innerHeight / 1007);
  $("#archive-viewport").style.transform =
    `translate(-50%, -50%) scale(${scale})`;
  scene?.resize();
  viewer?.resize();
}
window.addEventListener("resize", resize);
$("#stage").dataset.mode = "archive";
$("#stage").classList.toggle("reduced", prefs.reduced);
resize();
selection();
async function start() {
  try {
    await Promise.all([
      document.fonts.load("400 20px MiSans"),
      document.fonts.load("700 20px MiSans"),
    ]);
    scene = new MetalScene($("#scene"));
    scene.setPreferences(prefs.reduced, prefs.quality);
    await scene.load();
    scene.select({ lane, row });
    scene.onPick = (cell) => {
      select(cell.lane, cell.row);
    };
    scene.onOpen = () => openDetail();
    scene.onHover = (code, x, y) => {
      const h = $("#hover");
      h.hidden = !code;
      if (code) {
        h.textContent = code;
        const rect = $("#stage").getBoundingClientRect(),
          scale = rect.width / 1920;
        h.style.left = (x - rect.left) / scale + 18 + "px";
        h.style.top = (y - rect.top) / scale + 18 + "px";
      }
    };
    scene.refreshLabels();
    $("#loading").classList.add("loaded");
    setTimeout(() => $("#loading").remove(), 600);
    const params = new URLSearchParams(location.search);
    if (
      params.get("scene") === "detail" ||
      (selectedVersion && requestedDetail) ||
      (!bridgeReady && previous.detail)
    ) {
      openDetail(
        ["overview", "documents", "related", "analysis"].includes(previous.tab)
          ? previous.tab
          : "overview",
      );
    }
    let frames = 0,
      start = performance.now();
    function frame(ms: number) {
      if (!document.hidden) {
        if (!viewer?.isOpen) scene.update(ms / 1000);
        else viewer.update(ms / 1000);
        if (detail) {
          $("#detail-content").style.opacity = String(scene.detailVisibility);
          const stats = JSON.parse($("#scene").dataset.stats ?? "{}");
          $("#drag-hint").textContent = stats.canRotate
            ? "DRAG TO INSPECT ↔"
            : stats.phase === "aligning"
              ? "ALIGNING ARCHIVE…"
              : "LIFTING ARCHIVE…";
        }
        frames++;
        if (ms - start > 1000) {
          $("#stage").dataset.fps = String(
            Math.round((frames * 1000) / (ms - start)),
          );
          frames = 0;
          start = ms;
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } catch (error) {
    console.error(error);
    $("#loading").innerHTML =
      '<p>ARCHIVE CONNECTION INTERRUPTED</p><span>请检查浏览器 WebGL 支持及本地资源加载。</span><button onclick="location.reload()">RETRY CONNECTION ↗</button>';
  }
}
void start();
