import { config } from "./runtimeConfig";

/** Traffic-light states, worst to best. */
export type Health = "offline" | "degraded" | "online" | "checking";

export interface ServiceProbe {
  /** Key used for React lists and for the dot's colour class. */
  key: string;
  /** What the kitchen calls this station, shown on the pill. */
  label: string;
  baseUrl: string;
}

/** Every service the platform depends on, in the order they appear on the pass. */
export const SERVICES: ServiceProbe[] = [
  { key: "audio", label: "Audio", baseUrl: config.audioUrl },
  { key: "image", label: "Images", baseUrl: config.imageUrl },
  { key: "calendar", label: "Calendar", baseUrl: config.calendarUrl },
  { key: "pizza", label: "Pizza", baseUrl: config.pizzaUrl },
  { key: "master", label: "Master Control", baseUrl: config.masterUrl },
];

const TIMEOUT_MS = 4000;

/**
 * One GET /health. A reply that isn't 200 means the service answered but isn't
 * well - that's "degraded", not "offline"; only a failed connection (or a reply
 * that never arrives) means nobody is at the station.
 */
export async function probe(baseUrl: string, timeoutMs = TIMEOUT_MS): Promise<Health> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: abort.signal });
    return response.ok ? "online" : "degraded";
  } catch {
    return "offline";
  } finally {
    clearTimeout(timer);
  }
}
