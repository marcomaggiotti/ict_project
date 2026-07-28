import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useBackendConfig } from "../config";

export function SettingsScreen() {
  const { config, update } = useBackendConfig();
  const [form, setForm] = useState(config);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Backend Settings</Text>
      <Text style={styles.muted}>
        Point this app at your deployed microservices. Saved on this device only.
      </Text>

      {(
        [
          ["audioUrl", "Audio service URL"],
          ["calendarUrl", "Calendar service URL"],
          ["imageUrl", "Image service URL"],
          ["masterUrl", "Master service URL"],
        ] as const
      ).map(([key, label]) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(v) => setForm({ ...form, [key]: v })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>{saved ? "Saved!" : "Save"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  muted: { color: "#888", marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { marginBottom: 4, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8 },
  button: { backgroundColor: "#245", padding: 12, borderRadius: 6, marginTop: 8, marginBottom: 32 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
});
