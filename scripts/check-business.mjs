import assert from "node:assert/strict";
import { mkdir, writeFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "../server/index.mjs";

const testFolder = await mkdtemp(path.join(os.tmpdir(), "gotham-browser-"));
const testServer = await createServer({
  file: path.join(testFolder, "state.json"),
});
await new Promise((resolve) => testServer.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${testServer.address().port}`;
const pages = await fetch(
  `http://127.0.0.1:${process.env.CDP_PORT ?? 9341}/json`,
).then((r) => r.json());
const ws = new WebSocket(
  pages.find((p) => p.type === "page").webSocketDebuggerUrl,
);
await new Promise((resolve) =>
  ws.addEventListener("open", resolve, { once: true }),
);
let id = 0;
const pending = new Map(),
  exceptions = [],
  failedLocalRequests = [];
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? request?.reject(message.error)
      : request?.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    exceptions.push(message.params.exceptionDetails);
  if (message.method === "Network.responseReceived") {
    const response = message.params.response;
    if (response.url.startsWith(origin) && response.status >= 400)
      failedLocalRequests.push({ url: response.url, status: response.status });
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expression) => {
  const response = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
};
const inReport = (expression) =>
  evaluate(
    `document.querySelector('.report-archive-frame').contentWindow.eval(${JSON.stringify(expression)})`,
  );
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn, label) => {
  for (let i = 0; i < 160; i++) {
    if (await fn()) return;
    await wait(150);
  }
  throw Error("Timed out: " + label);
};
const click = (selector, report = false) =>
  (report ? inReport : evaluate)(
    `(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.click();})()`,
  );
const key = async (value) => {
  const code = {
    Escape: 27,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
  }[value];
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: value,
    code: value,
    windowsVirtualKeyCode: code,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: value,
    code: value,
    windowsVirtualKeyCode: code,
  });
};
const stats = () =>
  inReport("JSON.parse(document.querySelector('#scene').dataset.stats)");
const ready = () =>
  until(
    () =>
      evaluate(
        "!!document.querySelector('.report-archive-frame')?.contentDocument.querySelector('#scene')?.dataset.stats&&!document.querySelector('.report-archive-frame').contentDocument.querySelector('#loading')",
      ),
    "report ready",
  );
const output = new URL("../docs/business-verification/", import.meta.url);
await mkdir(output, { recursive: true });
const screenshot = async (name) => {
  const result = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(
    new URL(name + ".png", output),
    Buffer.from(result.data, "base64"),
  );
};
const checks = [];
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  ws.addEventListener("message", (event) => {
    if (JSON.parse(event.data).method === "Page.javascriptDialogOpening")
      void send("Page.handleJavaScriptDialog", { accept: true });
  });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: origin });
  await until(
    () =>
      evaluate("!!document.querySelector('[aria-label=\"打开Operations\"]')"),
    "navigation",
  );
  await click('[aria-label="打开Operations"]');
  await until(
    () =>
      evaluate(
        "document.querySelectorAll('.mine-sidebar .object-row').length===3",
      ),
    "three devices",
  );
  await click(".mine-sidebar .object-row:nth-child(2)");
  await until(
    () =>
      evaluate(
        "document.querySelectorAll('.inspector-section details').length===4",
      ),
    "evidence",
  );
  await screenshot("operations");
  checks.push(
    "Three fleet models map to equipment and evidence in existing Inspector",
  );
  await evaluate(
    "[...document.querySelectorAll('.inspector-actions button')].find(b=>b.textContent.includes('补充维修史')).click()",
  );
  await ready();
  await until(
    () =>
      inReport(
        "document.querySelector('#detail-title').textContent.includes('复核')",
      ),
    "review detail",
  );
  await until(async () => (await stats()).canRotate, "detail animation");
  await screenshot("diagnosis");
  assert.equal(
    await inReport("document.querySelector('#report-version').value"),
    "2",
  );
  await inReport(
    "const v=document.querySelector('#report-version');v.value='1';v.dispatchEvent(new Event('change',{bubbles:true}))",
  );
  await until(
    () => inReport("document.querySelector('#report-version').value==='1'"),
    "old version",
  );
  await click("[data-business=equipment]", true);
  await until(
    () =>
      evaluate(
        "document.querySelector('.inspector-title')?.textContent.includes('XE215C')",
      ),
    "source device",
  );
  checks.push(
    "Review generates v2; archived v1 remains accessible; source link opens correct device",
  );
  await evaluate(
    "document.querySelector('[aria-label=\"需求数量\"]').value='2';document.querySelector('[aria-label=\"需求数量\"]').dispatchEvent(new Event('change',{bubbles:true}))",
  );
  await evaluate(
    "[...document.querySelectorAll('.inspector-actions button')].find(b=>b.textContent.includes('生成需求报告')).click()",
  );
  await ready();
  await until(
    () =>
      inReport(
        "document.querySelector('#detail-title').textContent.includes('需求报告')",
      ),
    "business report",
  );
  await until(async () => (await stats()).canRotate, "business animation");
  await screenshot("business-report");
  await click('[data-action=save]',true);
  assert.equal(await inReport("document.querySelector('#saved-count').textContent"),'01');
  await click("[data-business=push]", true);
  await until(
    () =>
      inReport(
        "document.querySelector('[data-business=push]')?.textContent.includes('已模拟推送')",
      ),
    "simulated push",
  );
  checks.push("Simulated push persists locally and updates the report");
  await click("[data-tab=related]", true);
  await until(
    () => inReport("!!document.querySelector('[data-source-report]')"),
    "source report link",
  );
  await click("[data-source-report]", true);
  await until(
    () =>
      inReport(
        "document.querySelector('#detail-title').textContent.includes('复核')",
      ),
    "exact source report",
  );
  checks.push(
    "Demand report is generated and links to exact reviewed diagnosis",
  );
  await click("[data-tab=documents]", true);
  await click("[data-business=documents]", true);
  await until(
    () =>
      evaluate(
        "document.querySelectorAll('.archive-list .list-row').length===3",
      ),
    "filtered documents",
  );
  await click(".archive-list .list-row");
  assert.ok(
    await evaluate(
      "document.querySelector('.preview-content').textContent.includes('模拟')",
    ),
  );
  await screenshot("documents");
  checks.push("Documents filter by equipment and show actual mock content");
  await click('[aria-label="打开Reports"]');
  await ready();
  await click("[data-action=back]", true);
  await wait(2400);
  await screenshot("archive");
  assert.equal(
    await evaluate("document.querySelectorAll('header.topbar').length"),
    1,
  );
  assert.equal(
    await inReport("document.querySelectorAll('header.topbar').length"),
    0,
  );
  await click("[data-action=search]", true);
  assert.equal(
    await inReport("document.querySelectorAll('#results .result').length"),
    4,
  );
  await click("[data-close]", true);
  const selectedCode = await inReport(
    "document.querySelector('#code').textContent",
  );
  await click('[aria-label="打开Archive"]');
  await click('[aria-label="打开Reports"]');
  await ready();
  assert.equal(
    await inReport("document.querySelector('#stage').dataset.mode"),
    "archive",
  );
  assert.equal(
    await inReport("document.querySelector('#code').textContent"),
    selectedCode,
  );
  checks.push(
    "Report selection and overview mode restore after switching tabs",
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(400);
  await screenshot("archive-1280");
  assert.ok(await inReport("document.documentElement.scrollWidth<=innerWidth"));
  checks.push(
    "Metal archive retains scene and single navigation with four actual reports and responsive layout",
  );
  await click('[aria-label="打开 Global Overview"]');
  await click(".overview-drawer-toggle");
  await evaluate(
    "const s=document.querySelector('[aria-label=\"重置模式\"]');s.value='empty';s.dispatchEvent(new Event('change',{bubbles:true}))",
  );
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent==='确认重置').click()",
  );
  await until(
    () =>
      evaluate(
        "document.querySelector('[aria-label=\"重置模式\"]').value===''",
      ),
    "reset confirmation",
  );
  await click('[aria-label="打开Reports"]');
  await ready();
  await until(
    () => inReport("document.querySelector('.access').disabled"),
    "empty reports",
  );
  assert.ok(
    await inReport(
      "document.querySelector('.counter small').textContent.includes('00')",
    ),
  );
  await click("[data-action=search]", true);
  assert.equal(
    await inReport("document.querySelectorAll('#results .result').length"),
    0,
  );
  await click("[data-close]", true);
  await screenshot("empty-reports");
  await click('[aria-label="打开Operations"]');
  await click(".mine-sidebar .object-row");
  await until(
    () =>
      evaluate(
        "document.querySelectorAll('.inspector-section details').length===4",
      ),
    "truck evidence",
  );
  await evaluate(
    "[...document.querySelectorAll('.inspector-actions button')].find(b=>b.textContent.includes('发起模拟诊断')).click()",
  );
  await ready();
  await until(
    () =>
      inReport(
        "document.querySelector('#detail-title').textContent.includes('Truck-01')",
      ),
    "single report",
  );
  await click("[data-action=viewer]", true);
  await until(
    () =>
      inReport(
        "!!document.querySelector('.object-viewer')?.dataset.stats&&JSON.parse(document.querySelector('.object-viewer').dataset.stats).loaded",
      ),
    "assembly model",
  );
  await click("[data-view=explode]", true);
  await until(
    () =>
      inReport(
        "JSON.parse(document.querySelector('.object-viewer').dataset.stats).spread>.999",
      ),
    "explode",
  );
  await click("[data-view=assemble]", true);
  await until(
    () =>
      inReport(
        "JSON.parse(document.querySelector('.object-viewer').dataset.stats).spread<.001",
      ),
    "assemble",
  );
  await key("Escape");
  checks.push(
    "Empty reset and first new report work; existing model explode/reassemble remains functional",
  );
  await click('[aria-label="打开 Global Overview"]');
  await click(".overview-drawer-toggle");
  await send("Network.setBlockedURLs", { urls: [`${origin}/api/*`] });
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent==='刷新数据').click()",
  );
  await until(
    () => evaluate("!!document.querySelector('.business-notice[role=alert]')"),
    "network error",
  );
  await send("Network.setBlockedURLs", { urls: [] });
  await click(".business-notice button");
  await until(
    () => evaluate("!document.querySelector('.business-notice')"),
    "network recovery",
  );
  checks.push(
    "API failures show a local retry control and recover without clearing workspaces",
  );
  assert.deepEqual(exceptions, []);
  const failures = failedLocalRequests.filter(
    (r) => !r.url.endsWith("/favicon.ico"),
  );
  assert.deepEqual(failures, []);
  const result = { checks, exceptions, failedLocalRequests: failures };
  await writeFile(
    new URL("checks.json", output),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  ws.close();
  await new Promise((resolve) => testServer.close(resolve));
}
