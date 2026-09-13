import { useEffect, useState } from "react";
import type { WorkspaceManagerAPI } from "../App";
import { useBusiness } from "../store/BusinessProvider";
import { api } from "../api/client";
import type { Report, List } from "../../shared/contracts";
export default function MineWorkspace({
  manager,
  params,
}: {
  manager: WorkspaceManagerAPI;
  params?: Record<string, unknown>;
}) {
  const { data, mutate, refresh } = useBusiness();
  const mineId = String(params?.mineId ?? "yulong-mine");
  const objects = data.equipment.filter((e) => e.mineId === mineId);
  const [selectedId, setSelectedId] = useState(
    String(params?.equipmentId ?? ""),
  );
  const [evidence, setEvidence] = useState<
      { id: string; title: string; body: string }[]
    >([]),
    [telemetry, setTelemetry] = useState<
      { field: string; value: number; unit: string }[]
    >([]),
    [alertList, setAlerts] = useState<{ title: string }[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [units, setUnits] = useState(1),
    [delivery, setDelivery] = useState("2026Q4"),
    [finance, setFinance] = useState(false);
  useEffect(() => {
    setSelectedId(String(params?.equipmentId ?? ""));
  }, [params?.equipmentId, mineId]);
  const selected = objects.find((e) => e.id === selectedId);
  const diagnosis = data.reports.find(
    (r) => r.type === "diagnosis" && r.equipmentId === selectedId,
  );
  useEffect(() => {
    setEvidence([]);
    setTelemetry([]);
    setAlerts([]);
    setError("");
    if (!selected) return;
    const ctrl = new AbortController();
    const options = { signal: ctrl.signal };
    Promise.all([
      api<List<any>>("/evidence-sources?equipmentId=" + selected.id, options),
      api<List<any>>("/equipment/" + selected.id + "/telemetry", options),
      api<List<any>>("/equipment/" + selected.id + "/alerts", options),
    ])
      .then(([ev, t, a]) => {
        setEvidence(ev.items);
        setTelemetry(t.items.slice(-1));
        setAlerts(a.items);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [selected?.id, reload]);
  async function perform(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await mutate<Report>(path, {
        ...(body as object),
        requestId: crypto.randomUUID(),
      });
      manager.openWorkspace("report", "商业报告", {
        reportId: r.id,
        version: r.version,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace mine-workspace">
      <aside className="mine-sidebar">
        <div className="sidebar-header">
          <h3>{data.mines.find((m) => m.id === mineId)?.name ?? "矿区"}</h3>
          <span className="sidebar-sub">对象列表 · 模拟数据</span>
        </div>
        <div className="object-list">
          {objects.map((obj) => (
            <button
              key={obj.id}
              className={`object-row ${selectedId === obj.id ? "selected" : ""}`}
              onClick={() => setSelectedId(obj.id)}
            >
              <span className={`row-status ${obj.status}`} />
              <span className="row-name">{obj.name}</span>
              <span className="row-type">{obj.type}</span>
            </button>
          ))}
          {!objects.length && (
            <p className="inspector-empty">此矿区暂无演示设备</p>
          )}
        </div>
      </aside>
      <section className="mine-map">
        <div className="map-placeholder inner">
          <div className="map-grid" />
          <div className="map-overlay">
            <p>MAP WORKSPACE</p>
            <p className="map-coords">
              {selected
                ? `${selected.model} / ${selected.id}`
                : "矿区地形 · 二维占位"}
            </p>
          </div>
        </div>
      </section>
      <aside className="mine-inspector">
        <div className="inspector-header">
          <h3>Inspector</h3>
        </div>
        {selected ? (
          <div className="inspector-body">
            <div className="inspector-title">{selected.name}</div>
            <div className="inspector-meta">
              <span>{selected.model}</span>
              <span className={`status-text ${selected.status}`}>
                {selected.status}
              </span>
            </div>
            <div className="inspector-section">
              <h4>运行数据 · 模拟</h4>
              <div className="stat-row">
                <span>累计工时</span>
                <span>{selected.hours} h</span>
              </div>
              {telemetry.map((t) => (
                <div className="stat-row" key={t.field}>
                  <span>{t.field}</span>
                  <span>
                    {t.value} {t.unit}
                  </span>
                </div>
              ))}
              {alertList.map((a) => (
                <p key={a.title}>{a.title}</p>
              ))}
            </div>
            <div className="inspector-section">
              <h4>Data Fabric · 证据链</h4>
              {evidence.map((e) => (
                <details key={e.id}>
                  <summary>{e.title}</summary>
                  <p>{e.body}</p>
                </details>
              ))}
            </div>
            <div className="inspector-section">
              <h4>客户分类</h4>
              <select
                aria-label="客户分类"
                value={
                  data.customers.find((c) => c.id === selected.customerId)
                    ?.category ?? "一般客户"
                }
                disabled={busy}
                onChange={async (e) => {
                  setBusy(true);
                  try {
                    await api("/customers/" + selected.customerId, {
                      method: "PATCH",
                      body: JSON.stringify({ category: e.target.value }),
                    });
                    await refresh();
                    setReload((n) => n + 1);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {["战略客户", "大客户", "潜在客户", "一般客户"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="inspector-actions">
              <button
                className="action-btn"
                disabled={busy || !evidence.length}
                onClick={() =>
                  void perform("/diagnoses", {
                    equipmentId: selected.id,
                    evidenceIds: [`IOT-${selected.id}`, `WO-${selected.id}`],
                  })
                }
              >
                {busy ? "处理中…" : "发起模拟诊断"}
              </button>
              {diagnosis && (
                <>
                  <button
                    className="action-btn secondary"
                    disabled={busy}
                    onClick={() =>
                      void perform(`/diagnoses/${diagnosis.id}/reviews`, {
                        baseVersion: diagnosis.version,
                        evidenceIds: [`HISTORY-${selected.id}`],
                      })
                    }
                  >
                    补充维修史并复核 · v{diagnosis.version}
                  </button>
                  <h4>需求报告草稿</h4>
                  <label>
                    数量
                    <select
                      aria-label="需求数量"
                      value={units}
                      onChange={(e) => setUnits(Number(e.target.value))}
                    >
                      <option value={1}>1 台／套</option>
                      <option value={2}>2 台／套</option>
                    </select>
                  </label>
                  <label>
                    交期
                    <select
                      aria-label="交付窗口"
                      value={delivery}
                      onChange={(e) => setDelivery(e.target.value)}
                    >
                      <option>2026Q4</option>
                      <option>2027Q1</option>
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={finance}
                      onChange={(e) => setFinance(e.target.checked)}
                    />{" "}
                    融资方案（模拟）
                  </label>
                  <button
                    className="action-btn"
                    disabled={busy}
                    onClick={() =>
                      void perform("/business-reports", {
                        sourceId: diagnosis.id,
                        sourceVersion: diagnosis.version,
                        units,
                        delivery,
                        finance,
                      })
                    }
                  >
                    生成需求报告
                  </button>
                </>
              )}
              <button
                className="action-btn secondary"
                onClick={() =>
                  manager.openWorkspace("report", "商业报告", {
                    reportId: diagnosis?.id,
                    version: diagnosis?.version,
                  })
                }
              >
                查看商业报告
              </button>
              <button
                className="action-btn secondary"
                onClick={() =>
                  manager.openWorkspace("archive", "资料库", {
                    equipmentId: selected.id,
                  })
                }
              >
                查看资料
              </button>
            </div>
            {error && (
              <div role="alert">
                {error}
                <button onClick={() => setReload((n) => n + 1)}>
                  重新加载
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="inspector-empty">选择一个对象以查看详情</div>
        )}
      </aside>
    </div>
  );
}
