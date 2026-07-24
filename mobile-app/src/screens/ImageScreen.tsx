import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { makeImageApi, type FileMeta } from "../api";
import { ChatBox } from "../components/ChatBox";
import { useBackendConfig } from "../config";

export function ImageScreen() {
  const { config } = useBackendConfig();
  const api = useMemo(() => makeImageApi(config.imageUrl), [config.imageUrl]);
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission denied.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName || asset.uri.split("/").pop() || "image.jpg";
    try {
      await api.upload({ uri: asset.uri, name, mimeType: asset.mimeType || "image/jpeg" });
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
      <Text style={styles.title}>Image Files</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handlePickAndUpload}>
        <Text style={styles.buttonText}>Upload image</Text>
      </TouchableOpacity>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListEmptyComponent={<Text style={styles.muted}>No images yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.imageCell}>
            <Image source={{ uri: api.downloadUrl(item.id) }} style={styles.image} />
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.link}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <ChatBox chat={api.chat} placeholder="how many images are stored right now?" />
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
  imageCell: { flex: 1 / 3, alignItems: "center", padding: 4 },
  image: { width: 90, height: 90, borderRadius: 6, backgroundColor: "#eee" },
  link: { color: "#d33", marginTop: 4 },
});
