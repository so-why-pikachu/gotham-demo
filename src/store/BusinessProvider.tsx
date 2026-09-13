import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, command } from "../api/client";
import type { List, Snapshot } from "../../shared/contracts";
const empty: Snapshot = {
  equipment: [],
  reports: [],
  documents: [],
  customers: [],
  mines: [],
  opportunities: [],
};
const Context = createContext<{
  data: Snapshot;
  error: string;
  loading: boolean;
  refresh: () => Promise<void>;
  mutate: <T>(path: string, body: unknown) => Promise<T>;
}>({
  data: empty,
  error: "",
  loading: true,
  refresh: async () => {},
  mutate: async () => {
    throw Error("Provider missing");
  },
});
export function BusinessProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(empty),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const generation = useRef(0),
    controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setLoading(true);
    try {
      const keys = Object.keys(empty) as (keyof Snapshot)[];
      const values = await Promise.all(
        keys.map((k) =>
          api<List<any>>("/" + k + (k === "reports" ? "?limit=1000" : ""), {
            signal: ctrl.signal,
          }),
        ),
      );
      if (current !== generation.current) return;
      setData(
        Object.fromEntries(
          keys.map((k, i) => [k, values[i].items]),
        ) as unknown as Snapshot,
      );
      setError("");
    } catch (e) {
      if (!ctrl.signal.aborted) setError((e as Error).message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);
  const mutate = useCallback(
    async <T,>(path: string, body: unknown) => {
      const result = await command<T>(path, body);
      await refresh();
      return result;
    },
    [refresh],
  );
  return (
    <Context.Provider value={{ data, error, loading, refresh, mutate }}>
      {children}
    </Context.Provider>
  );
}
export const useBusiness = () => useContext(Context);
export function BusinessStatus() {
  const { error, loading, refresh } = useBusiness();
  return error ? (
    <div className="business-notice" role="alert">
      数据连接失败：{error} <button onClick={() => void refresh()}>重试</button>
    </div>
  ) : loading ? (
    <div className="business-notice" role="status">
      正在读取演示数据…
    </div>
  ) : null;
}
