import { config } from "./runtimeConfig";

export class ApiError extends Error {}

async function request<T>(base: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(`${response.status} ${response.statusText}${text ? `: ${text}` : ""}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return undefined as unknown as T;
}

export interface FileMeta {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  tags: string[];
}

export interface ChatResponse {
  reply: string;
  tool_calls: { tool: string; input: unknown; result: unknown }[];
}

function fileApi(base: string, resource: "audio" | "image") {
  return {
    list: () => request<{ items: FileMeta[]; count: number }>(base, `/${resource}`),
    upload: async (file: File, tags = ""): Promise<FileMeta> => {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${base}/${resource}?tags=${encodeURIComponent(tags)}`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new ApiError(`${response.status} ${response.statusText}`);
      return response.json();
    },
    remove: (id: string) => request<{ deleted: boolean }>(base, `/${resource}/${id}`, { method: "DELETE" }),
    downloadUrl: (id: string) => `${base}/${resource}/${id}/download`,
    chat: (message: string) =>
      request<ChatResponse>(base, "/agent/chat", { method: "POST", body: JSON.stringify({ message }) }),
  };
}

export const audioApi = fileApi(config.audioUrl, "audio");
export const imageApi = fileApi(config.imageUrl, "image");

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  kind: "event" | "reservation";
  resource: string;
  attendees: string[];
  status: "confirmed" | "cancelled";
  created_at: string;
}

export const calendarApi = {
  list: () => request<{ items: CalendarEvent[]; count: number }>(config.calendarUrl, "/events"),
  create: (event: Partial<CalendarEvent>) =>
    request<CalendarEvent>(config.calendarUrl, "/events", { method: "POST", body: JSON.stringify(event) }),
  cancel: (id: string) => request<{ cancelled: boolean }>(config.calendarUrl, `/events/${id}/cancel`, { method: "POST" }),
  remove: (id: string) => request<{ deleted: boolean }>(config.calendarUrl, `/events/${id}`, { method: "DELETE" }),
  chat: (message: string) =>
    request<ChatResponse>(config.calendarUrl, "/agent/chat", { method: "POST", body: JSON.stringify({ message }) }),
};

export interface ServiceStatus {
  name: string;
  container_name: string;
  base_url: string;
  status: string;
}

export const masterApi = {
  list: () => request<{ items: ServiceStatus[] }>(config.masterUrl, "/services"),
  enable: (name: string) => request<{ name: string; status: string }>(config.masterUrl, `/services/${name}/enable`, { method: "POST" }),
  disable: (name: string) => request<{ name: string; status: string }>(config.masterUrl, `/services/${name}/disable`, { method: "POST" }),
  restart: (name: string) => request<{ name: string; status: string }>(config.masterUrl, `/services/${name}/restart`, { method: "POST" }),
  chat: (message: string) =>
    request<ChatResponse>(config.masterUrl, "/agent/chat", { method: "POST", body: JSON.stringify({ message }) }),
};
