import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { seedState } from "./domain/reports.mjs";
export async function openStore(file) {
  let state;
  try {
    state = JSON.parse(await readFile(file, "utf8"));
    if (
      state.schema !== 1 ||
      !Array.isArray(state.reports) ||
      !Array.isArray(state.customers) ||
      !state.requests
    )
      throw Error("演示数据损坏，请保留文件并恢复备份");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    state = seedState();
  }
  let queue = Promise.resolve();
  const persist = async (next) => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file + ".tmp", JSON.stringify(next, null, 2));
    await rename(file + ".tmp", file);
  };
  await persist(state);
  return {
    read: () => structuredClone(state),
    mutate(fn) {
      const operation = queue.then(async () => {
        const next = structuredClone(state);
        const result = await fn(next);
        await persist(next);
        state = next;
        return result;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
}
