import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rename, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openStore } from "../storage.mjs";
test("failed disk writes do not commit memory; subsequent mutations recover", async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), "gotham-store-"));
  const file = path.join(folder, "state.json");
  const store = await openStore(file);
  const before = store.read();
  await rename(file, file + ".backup");
  await mkdir(file);
  await assert.rejects(
    store.mutate((s) => {
      s.customers[0].category = "潜在客户";
    }),
  );
  assert.deepEqual(store.read(), before);
  await rename(file, path.join(folder, "obstruction"));
  await rename(file + ".backup", file);
  await store.mutate((s) => {
    s.customers[0].category = "大客户";
  });
  assert.equal(
    JSON.parse(await readFile(file, "utf8")).customers[0].category,
    "大客户",
  );
});
