import { useState } from "react";
import type { WorkspaceManagerAPI } from "../App";
import { ChevronRight } from "./Icons";
import CesiumViewer from "./CesiumViewer";
import { useBusiness } from "../store/BusinessProvider";
export default function GlobalOverview({
  manager,
}: {
  manager: WorkspaceManagerAPI;
}) {
  const [overviewOpen, setOverviewOpen] = useState(false),
    [preset, setPreset] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { data, refresh, mutate } = useBusiness();
  return (
    <div className="workspace global-overview">
      <div className="map-placeholder cesium-map-placeholder">
        <CesiumViewer
          onOpenEquipment={(equipmentId) =>
            manager.openWorkspace("mine", "玉龙矿区", {
              equipmentId,
              mineId: "yulong-mine",
            })
          }
        />
      </div>
      <section className={`overview-drawer ${overviewOpen ? "open" : ""}`}>
        <button
          className="overview-drawer-toggle"
          type="button"
          aria-expanded={overviewOpen}
          onClick={() => setOverviewOpen(!overviewOpen)}
        >
          <span className="drawer-toggle-copy">
            <span className="drawer-kicker">GLOBAL OVERVIEW</span>
            <span className="drawer-coordinates">
              35.2°N 102.5°E · ASIA-PACIFIC REGION
            </span>
          </span>
          <span className="drawer-toggle-hint">
            {overviewOpen ? "收起" : "展开概览"}
          </span>
          <ChevronRight size={15} className="drawer-chevron" />
        </button>
        {overviewOpen && (
          <div className="overview-panels">
            <div className="panel">
              <h3>活跃矿区</h3>
              <div className="panel-body">
                {data.mines.map((m) => (
                  <button
                    className="object-row"
                    key={m.id}
                    onClick={() =>
                      manager.openWorkspace("mine", m.name, {
                        mineId: m.id,
                        equipmentId: undefined,
                      })
                    }
                  >
                    <span className="row-status active" />
                    <span className="row-name">{m.name}</span>
                    <span className="row-meta">
                      {data.equipment.filter((e) => e.mineId === m.id).length}{" "}
                      台
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="panel">
              <h3>快速操作</h3>
              <div className="panel-body">
                <button
                  className="action-btn"
                  onClick={() => manager.openWorkspace("report", "商业报告")}
                >
                  查看商业报告
                </button>
                <button
                  className="action-btn"
                  onClick={() =>
                    manager.openWorkspace("archive", "资料库", {
                      equipmentId: undefined,
                    })
                  }
                >
                  查看资料库
                </button>
                <button
                  className="action-btn secondary"
                  onClick={() => void refresh()}
                >
                  刷新数据
                </button>
              </div>
            </div>
            <div className="panel">
              <h3>系统状态 · 模拟</h3>
              <div className="panel-body">
                {[
                  ["演示设备", data.equipment.length],
                  ["已归档报告", data.reports.length],
                  ["商机", data.opportunities.length],
                ].map(([k, v]) => (
                  <div className="stat-row" key={k}>
                    <span>{k}</span>
                    <span className="stat-value">{v}</span>
                  </div>
                ))}
                <select
                  aria-label="重置模式"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                >
                  <option value="">演示进度…</option>
                  <option value="seeded">恢复预置报告</option>
                  <option value="empty">空报告开局</option>
                </select>
                {preset && (
                  <>
                    <p>清除当前报告及模拟推送记录？</p>
                    <button
                      className="action-btn"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await mutate("/demo/reset", {
                            preset,
                            confirm: true,
                          });
                          setPreset("");
                          setError("");
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      确认重置
                    </button>
                    <button onClick={() => setPreset("")}>取消</button>
                  </>
                )}
                {error && <p role="alert">{error}</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
