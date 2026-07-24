import { useEffect, useState } from "react";
import { masterApi, type ServiceStatus } from "../api";
import { ChatPanel } from "../components/ChatPanel";

export function MasterPage() {
  const [items, setItems] = useState<ServiceStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await masterApi.list();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggle(name: string, running: boolean) {
    try {
      if (running) await masterApi.disable(name);
      else await masterApi.enable(name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <h1>Master Control</h1>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const running = item.status === "running";
            return (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td className={running ? "status-up" : "status-down"}>{item.status}</td>
                <td>
                  <button onClick={() => toggle(item.name, running)}>{running ? "Disable" : "Enable"}</button>
                  <button onClick={() => masterApi.restart(item.name).then(refresh)}>Restart</button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                No managed services reported (or master-service is unreachable).
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Agent</h2>
      <ChatPanel chat={masterApi.chat} placeholder="turn off the image service" />
    </div>
  );
}
