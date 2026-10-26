import { useEffect, useState } from "react";
import { SERVICES, probe, type Health } from "../serviceHealth";

const REFRESH_MS = 15000;

/**
 * The pass light: one pill per service, each with a traffic-light dot.
 * Green = online, amber = answering but unhealthy, red = unreachable.
 */
export function ServiceStatusBar() {
  const [health, setHealth] = useState<Record<string, Health>>(() =>
    Object.fromEntries(SERVICES.map((service) => [service.key, "checking" as Health])),
  );

  useEffect(() => {
    let live = true;

    async function sweep() {
      const results = await Promise.all(
        SERVICES.map(async (service) => [service.key, await probe(service.baseUrl)] as const),
      );
      // The component may have unmounted while the sweep was in flight.
      if (live) setHealth(Object.fromEntries(results));
    }

    sweep();
    const timer = setInterval(sweep, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="status-bar" aria-label="Service status">
      {SERVICES.map((service) => {
        const state = health[service.key];
        return (
          <span key={service.key} className={`status-pill status-${state}`} title={`${service.baseUrl}/health`}>
            <span className="status-dot" aria-hidden="true" />
            <span className="status-name">{service.label}</span>
            <span className="status-state">{state}</span>
          </span>
        );
      })}
    </div>
  );
}
