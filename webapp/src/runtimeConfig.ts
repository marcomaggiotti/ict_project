declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

function readEnv(key: string, viteKey: string, fallback: string): string {
  const runtimeValue = window.__ENV__?.[key];
  if (runtimeValue && !runtimeValue.startsWith("${")) return runtimeValue;
  const viteValue = (import.meta.env as Record<string, string | undefined>)[viteKey];
  return viteValue || fallback;
}

export const config = {
  audioUrl: readEnv("AUDIO_URL", "VITE_AUDIO_URL", "http://localhost:8001"),
  calendarUrl: readEnv("CALENDAR_URL", "VITE_CALENDAR_URL", "http://localhost:8003"),
  imageUrl: readEnv("IMAGE_URL", "VITE_IMAGE_URL", "http://localhost:8002"),
  masterUrl: readEnv("MASTER_URL", "VITE_MASTER_URL", "http://localhost:8000"),
};
