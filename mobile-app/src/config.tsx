import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

export interface BackendConfig {
  audioUrl: string;
  calendarUrl: string;
  imageUrl: string;
  masterUrl: string;
}

// Unlike a web/Docker deployment, a mobile binary can't have its backend URLs injected at
// container-start time - it's installed once and run on the device. EXPO_PUBLIC_* vars give a
// build-time default (per-build-profile), and the in-app Settings screen lets a user override
// them at runtime, persisted to on-device storage.
const DEFAULT_CONFIG: BackendConfig = {
  audioUrl: process.env.EXPO_PUBLIC_AUDIO_URL || "http://localhost:8001",
  calendarUrl: process.env.EXPO_PUBLIC_CALENDAR_URL || "http://localhost:8003",
  imageUrl: process.env.EXPO_PUBLIC_IMAGE_URL || "http://localhost:8002",
  masterUrl: process.env.EXPO_PUBLIC_MASTER_URL || "http://localhost:8000",
};

const STORAGE_KEY = "ai-agent-backend-config";

interface ConfigContextValue {
  config: BackendConfig;
  loaded: boolean;
  update: (next: BackendConfig) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  loaded: false,
  update: async () => {},
});

export function ConfigProvider({ children }: PropsWithChildren) {
  const [config, setConfig] = useState<BackendConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
        } catch {
          // ignore malformed stored config, fall back to defaults
        }
      }
      setLoaded(true);
    });
  }, []);

  async function update(next: BackendConfig) {
    setConfig(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return <ConfigContext.Provider value={{ config, loaded, update }}>{children}</ConfigContext.Provider>;
}

export function useBackendConfig() {
  return useContext(ConfigContext);
}
