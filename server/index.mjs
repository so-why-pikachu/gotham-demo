import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openStore } from "./storage.mjs";
import { route } from "./routes.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function createServer({
  file = path.join(root, "data/demo-state.json"),
  dist = path.join(root, "dist"),
} = {}) {
  const store = await openStore(file);
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api")) {
        if (!url.pathname.startsWith("/api/v1/"))
          throw Object.assign(Error("接口不存在"), { status: 404 });
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 65536)
            throw Object.assign(Error("请求过大"), { status: 413 });
        }
        let body = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          throw Object.assign(Error("JSON 无效"), { status: 400 });
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw Object.assign(Error("请求对象无效"), { status: 400 });
        const result = await route(store, req.method, url, body);
        res.setHeader("Cache-Control", "no-store");
        if (result.download) {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${result.download}"`,
          );
          return res.end(result.text);
        }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.end(JSON.stringify({ ...result, mock: true }));
      }
      if (!["GET", "HEAD"].includes(req.method))
        throw Object.assign(Error("Method not allowed"), { status: 405 });
      const relative = decodeURIComponent(url.pathname);
      const target = path.resolve(
        dist,
        "." + (relative === "/" ? "/index.html" : relative),
      );
      if (!target.startsWith(path.resolve(dist) + path.sep))
        throw Object.assign(Error("Not found"), { status: 404 });
      if (!(await stat(target)).isFile())
        throw Object.assign(Error("Not found"), { status: 404 });
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".glb": "model/gltf-binary",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".png": "image/png",
      };
      res.setHeader(
        "Content-Type",
        types[path.extname(target)] ?? "application/octet-stream",
      );
      res.end(req.method === "HEAD" ? undefined : await readFile(target));
    } catch (e) {
      res.statusCode = e.status ?? (e.code === "ENOENT" ? 404 : 500);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          mock: true,
          error: {
            code: String(res.statusCode),
            message:
              res.statusCode === 500 ? "服务暂不可用，请重试" : e.message,
          },
        }),
      );
      if (res.statusCode === 500) console.error(e);
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await createServer({ file: process.env.DEMO_STATE_FILE });
  const host = process.env.API_HOST ?? "127.0.0.1";
  server.listen(Number(process.env.API_PORT ?? 5182), host, () =>
    console.log(
      `Gotham Mock API http://${host}:${process.env.API_PORT ?? 5182}`,
    ),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => server.close(() => process.exit(0)));
}
