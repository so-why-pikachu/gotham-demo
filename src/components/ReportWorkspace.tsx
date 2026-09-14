import { useEffect, useRef } from "react";
import { useBusiness } from "../store/BusinessProvider";
import { api } from "../api/client";
import type { Report, List, BridgeMessage } from "../../shared/contracts";
import type { WorkspaceManagerAPI } from "../App";
export default function ReportWorkspace({
  manager,
  params,
}: {
  manager: WorkspaceManagerAPI;
  params?: Record<string, unknown>;
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    ready = useRef(false),
    generation = useRef(0);
  const { data, mutate, refresh } = useBusiness();
  const current = useRef({ data, mutate, manager, params, refresh });
  current.current = { data, mutate, manager, params, refresh };
  const post = (
    type: string,
    payload: unknown,
    requestId: string = crypto.randomUUID(),
  ) =>
    frame.current?.contentWindow?.postMessage(
      { protocol: "gotham-report", version: 1, type, requestId, payload },
      location.origin,
    );
  async function snapshot(
    reportId?: string,
    version?: number,
    requestId?: string,
  ) {
    const ticket = ++generation.current;
    const reports = current.current.data.reports;
    let selected: Report | undefined,
      versions: Report[] = [];
    if (reportId && reports.some((r) => r.id === reportId)) {
      const rs = await api<List<Report>>(
        `/reports/${encodeURIComponent(reportId)}/versions`,
      );
      versions = rs.items;
      selected = version
        ? versions.find((r) => r.version === version)
        : versions.at(-1);
      if (!selected) throw Error("报告版本不存在");
    }
    if (ticket === generation.current && ready.current)
      post(
        "SNAPSHOT",
        {
          reports,
          selected,
          versions,
          openDetail: current.current.params?.detail !== false,
        },
        requestId,
      );
  }
  useEffect(() => {
    const handler = async (e: MessageEvent<BridgeMessage>) => {
      const m = e.data;
      if (
        e.origin !== location.origin ||
        e.source !== frame.current?.contentWindow ||
        m?.protocol !== "gotham-report" ||
        m.version !== 1 ||
        typeof m.requestId !== "string"
      )
        return;
      try {
        if (m.type === "READY") {
          ready.current = true;
          await snapshot(
            current.current.params?.reportId as string,
            current.current.params?.version as number,
            m.requestId,
          );
          return;
        }
        const p = m.payload ?? {};
        if (m.type === "SELECT_REPORT") {
          if (typeof p.id !== "string") throw Error("报告编号无效");
          current.current.manager.openWorkspace("report", "报告", {
            reportId: p.id,
            version: p.version,
            detail: p.openDetail !== false,
          });
          await snapshot(p.id, p.version, m.requestId);
          post("RESULT", {}, m.requestId);
          return;
        }
        if (m.type === "OPEN_EQUIPMENT") {
          if (!current.current.data.equipment.some((e) => e.id === p.id))
            throw Error("设备不存在");
          current.current.manager.openWorkspace("mine", "玉龙矿区", {
            equipmentId: p.id,
            mineId: "yulong-mine",
          });
        } else if (m.type === "OPEN_DOCUMENTS")
          current.current.manager.openWorkspace("archive", "资料库", {
            equipmentId: p.id,
          });
        else if (m.type === "EXPORT_REPORT") {
          const res = await fetch(
            `/api/v1/reports/${encodeURIComponent(p.id)}/export?version=${Number(p.version)}&format=markdown`,
          );
          if (!res.ok) throw Error("导出失败，请重试");
          const url = URL.createObjectURL(await res.blob());
          const a = document.createElement("a");
          a.href = url;
          a.download = `${p.id}-v${p.version}.md`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else if (m.type === "SIMULATE_PUSH") {
          await current.current.mutate(
            `/business-reports/${encodeURIComponent(p.id)}/push`,
            { version: p.version, requestId: m.requestId },
          );
          await snapshot(p.id, p.version);
        } else if (m.type === "RETRY") {
          await current.current.refresh();
        } else return;
        post(
          "RESULT",
          {
            message:
              m.type === "SIMULATE_PUSH"
                ? "已记录模拟推送，未发送外部消息"
                : "操作完成",
          },
          m.requestId,
        );
      } catch (error) {
        post("ERROR", { message: (error as Error).message }, m.requestId);
      }
    };
    window.addEventListener("message", handler);
    return () => {
      ready.current = false;
      generation.current++;
      window.removeEventListener("message", handler);
    };
  }, []);
  useEffect(() => {
    if (ready.current)
      void snapshot(
        params?.reportId as string,
        params?.version as number,
      ).catch((e) => post("ERROR", { message: e.message }));
  }, [data.reports, params?.reportId, params?.version, params?.detail]);
  return (
    <section className="workspace report-workspace" aria-label="报告">
      <iframe
        ref={frame}
        className="report-archive-frame"
        src="/report-archive/index.html"
        title="报告 · 金属档案库"
        onLoad={(e) => e.currentTarget.contentWindow?.focus()}
      />
    </section>
  );
}
