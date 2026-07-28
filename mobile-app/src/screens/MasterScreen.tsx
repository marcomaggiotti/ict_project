import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { makeMasterApi, type ServiceStatus } from "../api";
import { ChatBox } from "../components/ChatBox";
import { useBackendConfig } from "../config";

export function MasterScreen() {
  const { config } = useBackendConfig();
  const api = useMemo(() => makeMasterApi(config.masterUrl), [config.masterUrl]);
  const [items, setItems] = useState<ServiceStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.list();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggle(name: string, running: boolean) {
    try {
      if (running) await api.disable(name);
      else await api.enable(name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Master Control</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={items}
        keyExtractor={(item) => item.name}
        ListEmptyComponent={<Text style={styles.muted}>No managed services reported.</Text>}
        renderItem={({ item }) => {
          const running = item.status === "running";
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>{item.name}</Text>
                <Text style={running ? styles.up : styles.down}>{item.status}</Text>
              </View>
              <TouchableOpacity onPress={() => toggle(item.name, running)}>
                <Text style={styles.link}>{running ? "Disable" : "Enable"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => api.restart(item.name).then(refresh)} style={{ marginLeft: 12 }}>
                <Text style={styles.link}>Restart</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      <ChatBox chat={api.chat} placeholder="turn off the image service" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  error: { color: "#d33", marginBottom: 8 },
  muted: { color: "#888" },
  up: { color: "#2a7" },
  down: { color: "#d33" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  link: { color: "#245", fontWeight: "600" },
});
