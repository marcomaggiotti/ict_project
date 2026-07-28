import * as DocumentPicker from "expo-document-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { makeAudioApi, type FileMeta } from "../api";
import { ChatBox } from "../components/ChatBox";
import { useBackendConfig } from "../config";

export function AudioScreen() {
  const { config } = useBackendConfig();
  const api = useMemo(() => makeAudioApi(config.audioUrl), [config.audioUrl]);
  const [items, setItems] = useState<FileMeta[]>([]);
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

  async function handlePickAndUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      await api.upload({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || "audio/*" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.remove(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Files</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handlePickAndUpload}>
        <Text style={styles.buttonText}>Upload audio file</Text>
      </TouchableOpacity>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.muted}>No audio files yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>
              {item.filename} ({(item.size_bytes / 1024).toFixed(1)} KB)
            </Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.link}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <ChatBox chat={api.chat} placeholder="list the audio files uploaded today" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  error: { color: "#d33", marginBottom: 8 },
  muted: { color: "#888" },
  button: { backgroundColor: "#245", padding: 10, borderRadius: 6, marginBottom: 12 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowText: { flex: 1 },
  link: { color: "#d33" },
});
