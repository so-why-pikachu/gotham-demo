import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "../index.mjs";
test("HTTP workflow, idempotency, exact versions, persistence and input errors", async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), "gotham-api-"));
  const file = path.join(folder, "state.json");
  let server = await createServer({ file });
  const listen = async () => {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return "http://127.0.0.1:" + server.address().port + "/api/v1";
  };
  let base = await listen();
  const call = async (p, body, method = body ? "POST" : "GET") => {
    const r = await fetch(base + p, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  };
  try {
    assert.equal((await call("/equipment")).body.total, 6);
    await call("/demo/reset", { preset: "empty", confirm: true });
    assert.equal((await call("/reports")).body.total, 0);
    const command = {
      equipmentId: "excavator-01",
      evidenceIds: ["IOT-excavator-01"],
      requestId: "diagnose-1",
    };
    const [a, b] = await Promise.all([
      call("/diagnoses", command),
      call("/diagnoses", command),
    ]);
    assert.equal(a.status, 200);
    assert.deepEqual(a, b);
    assert.equal((await call("/reports")).body.total, 1);
    assert.equal(
      (await call("/diagnoses", { ...command, equipmentId: "truck-01" }))
        .status,
      409,
    );
    const reviewed = await call("/diagnoses/DR-excavator-01/reviews", {
      baseVersion: 1,
      evidenceIds: ["HISTORY-excavator-01"],
      requestId: "review-1",
    });
    assert.equal(reviewed.body.version, 2);
    assert.equal(
      (
        await call("/diagnoses/DR-excavator-01/reviews", {
          baseVersion: 1,
          evidenceIds: ["WO-excavator-01"],
          requestId: "review-stale",
        })
      ).status,
      409,
    );
    assert.equal(
      (await call("/reports/DR-excavator-01/versions")).body.total,
      2,
    );
    const br = await call("/business-reports", {
      sourceId: "DR-excavator-01",
      sourceVersion: 2,
      units: 2,
      delivery: "2027Q1",
      finance: true,
      amountCents: 1,
      requestId: "business-1",
    });
    assert.equal(br.body.amountCents, 520000000);
    assert.equal(br.body.sourceVersion, 2);
    assert.equal((await call("/opportunities")).body.total, 1);
    const push = await call("/business-reports/BR-excavator-01/push", {
      version: 1,
      requestId: "push-1",
    });
    assert.equal(push.body.sent, true);
    assert.equal(
      (await call("/reports/DR-excavator-01/versions/1")).body.reviewed,
      false,
    );
    assert.equal(
      (await call("/reports?limit=1&offset=1")).body.items.length,
      1,
    );
    assert.equal((await call("/reports?limit=-1")).status, 400);
    for (const p of [
      "/health",
      "/overview",
      "/mines",
      "/equipment/truck-01",
      "/equipment/truck-01/alerts",
      "/equipment/truck-01/telemetry?from=2026-09-12T08:10:00Z",
      "/equipment/truck-01/work-orders",
      "/evidence-sources?equipmentId=truck-01",
      "/documents?equipmentId=truck-01",
      "/documents/WO-truck-01",
    ])
      assert.equal((await call(p)).status, 200, p);
    assert.equal(
      (await call("/equipment/truck-01/telemetry?from=invalid")).status,
      400,
    );
    assert.equal(
      (
        await call("/business-reports", {
          sourceId: "DR-excavator-01",
          sourceVersion: 2,
          units: 1.5,
          delivery: "2027Q1",
          finance: true,
          requestId: "bad-quantity",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("/business-reports", {
          sourceId: "missing",
          sourceVersion: 2,
          units: 1,
          delivery: "2027Q1",
          finance: true,
          requestId: "bad-source",
        })
      ).status,
      404,
    );
    assert.equal((await call("/does-not-exist")).status, 404);
    assert.equal((await call("/reports?type=business")).body.total, 1);
    const noPage = await fetch(base.replace("/api/v1", "") + "/missing.glb");
    assert.equal(noPage.status, 404);
    const malformed = await fetch(base + "/diagnoses", {
      method: "POST",
      body: "{",
    });
    assert.equal(malformed.status, 400);
    assert.equal(
      (
        await call("/diagnoses", {
          equipmentId: "excavator-01",
          evidenceIds: ["WO-truck-01"],
          requestId: "wrong",
        })
      ).status,
      400,
    );
    assert.equal((await call("/reports/missing")).status, 404);
    assert.equal((await call("/demo/reset", { preset: "empty" })).status, 400);
    assert.equal(
      (await call("/customers/yulong", { category: "潜在客户" }, "PATCH"))
        .status,
      200,
    );
    const exported = await fetch(
      base + "/reports/BR-excavator-01/export?version=1",
    );
    assert.ok((await exported.text()).includes("DR-excavator-01 2"));
    await new Promise((resolve) => server.close(resolve));
    server = await createServer({ file });
    base = await listen();
    assert.equal((await call("/reports/BR-excavator-01")).body.sent, true);
    assert.equal((await call("/customers")).body.items[0].category, "潜在客户");
    assert.equal(JSON.parse(await readFile(file, "utf8")).schema, 1);
    await writeFile(path.join(folder, "broken.json"), "broken");
    await assert.rejects(
      createServer({ file: path.join(folder, "broken.json") }),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
