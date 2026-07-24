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

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

function fileApi(base: string, resource: "audio" | "image") {
  return {
    list: () => request<{ items: FileMeta[]; count: number }>(base, `/${resource}`),
    upload: async (file: PickedFile): Promise<FileMeta> => {
      const form = new FormData();
      // React Native's FormData accepts this {uri, name, type} shape for file uploads.
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
      const response = await fetch(`${base}/${resource}`, { method: "POST", body: form });
      if (!response.ok) throw new ApiError(`${response.status} ${response.statusText}`);
      return response.json();
    },
    remove: (id: string) => request<{ deleted: boolean }>(base, `/${resource}/${id}`, { method: "DELETE" }),
    downloadUrl: (id: string) => `${base}/${resource}/${id}/download`,
    chat: (message: string) =>
      request<ChatResponse>(base, "/agent/chat", { method: "POST", body: JSON.stringify({ message }) }),
  };
}

export function makeAudioApi(base: string) {
  return fileApi(base, "audio");
}

export function makeImageApi(base: string) {
  return fileApi(base, "image");
}

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

export function makeCalendarApi(base: string) {
  return {
    list: () => request<{ items: CalendarEvent[]; count: number }>(base, "/events"),
    create: (event: Partial<CalendarEvent>) =>
      request<CalendarEvent>(base, "/events", { method: "POST", body: JSON.stringify(event) }),
    cancel: (id: string) => request<{ cancelled: boolean }>(base, `/events/${id}/cancel`, { method: "POST" }),
    remove: (id: string) => request<{ deleted: boolean }>(base, `/events/${id}`, { method: "DELETE" }),
    chat: (message: string) => request<ChatResponse>(base, "/agent/chat", { method: "POST", body: JSON.stringify({ message }) }),
  };
}

export interface ServiceStatus {
  name: string;
  container_name: string;
  base_url: string;
  status: string;
}

export function makeMasterApi(base: string) {
  return {
    list: () => request<{ items: ServiceStatus[] }>(base, "/services"),
    enable: (name: string) => request<{ name: string; status: string }>(base, `/services/${name}/enable`, { method: "POST" }),
    disable: (name: string) => request<{ name: string; status: string }>(base, `/services/${name}/disable`, { method: "POST" }),
    restart: (name: string) => request<{ name: string; status: string }>(base, `/services/${name}/restart`, { method: "POST" }),
    chat: (message: string) => request<ChatResponse>(base, "/agent/chat", { method: "POST", body: JSON.stringify({ message }) }),
  };
}
