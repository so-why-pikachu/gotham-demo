import {
  mines,
  equipment,
  documents,
  evidenceSources,
  telemetry,
  alerts,
} from "./seed/index.mjs";
import {
  fail,
  latest,
  opportunities,
  diagnose,
  business,
  seedState,
} from "./domain/reports.mjs";
const list = (items) => ({ items, total: items.length });
export async function route(store, method, url, body = {}) {
  const parts = url.pathname
    .replace(/^\/api\/v1\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  const [name, id, sub, version] = parts;
  const q = url.searchParams;
  const state = store.read();
  if (method === "GET") {
    if (name === "health") return { status: "ready", schema: 1 };
    if (name === "mines") return list(mines);
    if (name === "customers") return list(state.customers);
    if (name === "overview") {
      const es = equipment.filter(
        (e) => !q.has("mineId") || e.mineId === q.get("mineId"),
      );
      return {
        equipment: es.length,
        mines: mines.length,
        alerts: es.length,
        opportunities: opportunities(state).filter((o) =>
          es.some((e) => e.id === o.equipmentId),
        ).length,
      };
    }
    if (name === "equipment") {
      if (!id)
        return list(
          equipment.filter(
            (e) =>
              (!q.has("mineId") || e.mineId === q.get("mineId")) &&
              (!q.has("status") || e.status === q.get("status")) &&
              (!q.has("q") || (e.name + e.id).includes(q.get("q"))),
          ),
        );
      const e = equipment.find((e) => e.id === id);
      if (!e) fail(404, "设备不存在");
      if (!sub) return e;
      if (sub === "alerts") return list(alerts(id));
      if (sub === "work-orders")
        return list(
          documents.filter(
            (d) => d.equipmentId === id && d.category === "维修工单",
          ),
        );
      if (sub === "telemetry") {
        for (const key of ["from", "to"])
          if (q.has(key) && !Number.isFinite(Date.parse(q.get(key))))
            fail(400, "时间范围无效");
        return list(
          telemetry(id).filter(
            (t) =>
              (!q.has("from") ||
                Date.parse(t.time) >= Date.parse(q.get("from"))) &&
              (!q.has("to") || Date.parse(t.time) <= Date.parse(q.get("to"))),
          ),
        );
      }
    }
    if (name === "evidence-sources") {
      const id = q.get("equipmentId");
      if (!equipment.some((e) => e.id === id)) fail(404, "设备不存在");
      return list(evidenceSources(id));
    }
    if (name === "opportunities")
      return list(
        opportunities(state).filter(
          (o) =>
            (!q.has("mineId") || o.mineId === q.get("mineId")) &&
            (!q.has("customerId") || o.customerId === q.get("customerId")),
        ),
      );
    if (name === "documents") {
      const ds = documents.filter(
        (d) =>
          (!q.has("equipmentId") || d.equipmentId === q.get("equipmentId")) &&
          (!q.has("category") || d.category === q.get("category")) &&
          (!q.has("q") || (d.title + d.id).includes(q.get("q"))),
      );
      if (!id) return list(ds);
      const d = documents.find((d) => d.id === id);
      if (!d) fail(404, "文档不存在");
      return d;
    }
    if (name === "reports") {
      if (!id) {
        const rs = latest(state.reports).filter(
          (r) =>
            (!q.has("type") || r.type === q.get("type")) &&
            (!q.has("customerId") || r.customerId === q.get("customerId")) &&
            (!q.has("q") ||
              (r.title + r.id + r.conclusion)
                .toLowerCase()
                .includes(q.get("q").toLowerCase())),
        );
        const offset = Number(q.get("offset") ?? 0),
          limit = Number(q.get("limit") ?? 100);
        if (
          !Number.isInteger(offset) ||
          offset < 0 ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > 1000
        )
          fail(400, "分页参数无效");
        return { items: rs.slice(offset, offset + limit), total: rs.length };
      }
      const rs = state.reports.filter((r) => r.id === id);
      if (!rs.length) fail(404, "报告不存在");
      if (sub === "versions" && !version) return list(rs);
      const requested = version ?? q.get("version");
      const r = requested
        ? rs.find((r) => r.version === Number(requested))
        : rs.at(-1);
      if (!r) fail(404, "版本不存在");
      if (sub === "export") {
        if (q.has("format") && q.get("format") !== "markdown")
          fail(400, "仅支持 Markdown");
        return {
          download: `${r.id}-v${r.version}.md`,
          text: `# ${r.title}\n\n${r.id} v${r.version}\n\n演示模拟数据 · 未实际发送\n\n${r.conclusion}\n\n${r.evidence.join("\n\n")}\n\n金额：¥${(r.amountCents / 100).toFixed(2)}\n来源：${r.sourceId ?? r.equipmentId} ${r.sourceVersion ?? ""}\n`,
        };
      }
      if (!sub || sub === "versions") return r;
    }
  }
  if (method === "PATCH" && name === "customers" && id)
    return store.mutate((s) => {
      const c = s.customers.find((c) => c.id === id);
      if (!c) fail(404, "客户不存在");
      if (
        !["战略客户", "大客户", "潜在客户", "一般客户"].includes(body.category)
      )
        fail(400, "客户分类无效");
      c.category = body.category;
      return c;
    });
  if (method === "POST" && name === "demo" && id === "reset") {
    if (body.confirm !== true || !["seeded", "empty"].includes(body.preset))
      fail(400, "请明确确认重置模式");
    return store.mutate((s) => {
      Object.assign(s, seedState(body.preset));
      return { reset: true };
    });
  }
  if (method === "POST" && ["diagnoses", "business-reports"].includes(name)) {
    if (
      typeof body.requestId !== "string" ||
      !body.requestId ||
      body.requestId.length > 100
    )
      fail(400, "缺少有效 requestId");
    return store.mutate((s) => {
      const fingerprint = JSON.stringify([method, url.pathname, body]);
      const old = Object.hasOwn(s.requests, body.requestId)
        ? s.requests[body.requestId]
        : undefined;
      if (old) {
        if (old.fingerprint !== fingerprint)
          fail(409, "requestId 已用于不同操作");
        return old.result;
      }
      let result;
      if (name === "diagnoses" && !id) result = diagnose(s, body);
      else if (name === "diagnoses" && sub === "reviews") {
        const prior = latest(s.reports).find(
          (r) => r.id === id && r.type === "diagnosis",
        );
        if (!prior) fail(404, "诊断报告不存在");
        result = diagnose(s, body, prior);
      } else if (name === "business-reports" && !id) result = business(s, body);
      else if (name === "business-reports" && sub === "push") {
        const r = s.reports.find(
          (r) =>
            r.id === id && r.version === body.version && r.type === "business",
        );
        if (!r) fail(404, "商业报告版本不存在");
        r.sent = true;
        result = r;
      } else fail(404, "接口不存在");
      Object.defineProperty(s.requests, body.requestId, {
        value: { fingerprint, result: structuredClone(result) },
        writable: true,
        enumerable: true,
        configurable: true,
      });
      return result;
    });
  }
  fail(404, "接口不存在");
}
