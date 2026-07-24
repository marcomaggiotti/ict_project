import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { makeCalendarApi, type CalendarEvent } from "../api";
import { ChatBox } from "../components/ChatBox";
import { useBackendConfig } from "../config";

interface FormState {
  title: string;
  start_time: string;
  end_time: string;
  resource: string;
}

const empty: FormState = { title: "", start_time: "", end_time: "", resource: "" };

export function CalendarScreen() {
  const { config } = useBackendConfig();
  const api = useMemo(() => makeCalendarApi(config.calendarUrl), [config.calendarUrl]);
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

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

  async function handleCreate() {
    try {
      await api.create({
        title: form.title,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        kind: form.resource ? "reservation" : "event",
        resource: form.resource,
      });
      setForm(empty);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCancel(id: string) {
    try {
      await api.cancel(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar &amp; Reservations</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
      <TextInput
        style={styles.input}
        placeholder="Resource (leave blank for a plain event, e.g. conference-room-a)"
        value={form.resource}
        onChangeText={(v) => setForm({ ...form, resource: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Start (ISO 8601, e.g. 2026-08-01T10:00:00Z)"
        value={form.start_time}
        onChangeText={(v) => setForm({ ...form, start_time: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="End (ISO 8601, e.g. 2026-08-01T10:30:00Z)"
        value={form.end_time}
        onChangeText={(v) => setForm({ ...form, end_time: v })}
      />
      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Create</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.muted}>No events yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>{item.title}</Text>
              <Text style={styles.muted}>
                {item.kind} {item.resource ? `· ${item.resource}` : ""} · {item.status}
              </Text>
              <Text style={styles.muted}>
                {new Date(item.start_time).toLocaleString()} - {new Date(item.end_time).toLocaleString()}
              </Text>
            </View>
            {item.status === "confirmed" && (
              <TouchableOpacity onPress={() => handleCancel(item.id)}>
                <Text style={styles.link}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <ChatBox chat={api.chat} placeholder="book conference-room-a tomorrow 2-3pm" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  error: { color: "#d33", marginBottom: 8 },
  muted: { color: "#888" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8, marginBottom: 8 },
  button: { backgroundColor: "#245", padding: 10, borderRadius: 6, marginBottom: 12 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "600" },
  row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  link: { color: "#d33" },
});
