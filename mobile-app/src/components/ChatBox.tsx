import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { ChatResponse } from "../api";

interface Props {
  chat: (message: string) => Promise<ChatResponse>;
  placeholder: string;
}

interface Turn {
  role: "user" | "agent";
  text: string;
}

export function ChatBox({ chat, placeholder }: Props) {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = message.trim();
    if (!text || busy) return;
    setTurns((t) => [...t, { role: "user", text }]);
    setMessage("");
    setBusy(true);
    setError(null);
    try {
      const response = await chat(text);
      setTurns((t) => [...t, { role: "agent", text: response.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Agent</Text>
      {turns.length === 0 && <Text style={styles.muted}>Ask the agent, e.g. "{placeholder}"</Text>}
      {turns.map((t, i) => (
        <Text key={i} style={t.role === "user" ? styles.userTurn : styles.agentTurn}>
          {t.role === "user" ? "You: " : "Agent: "}
          {t.text}
        </Text>
      ))}
      {busy && <ActivityIndicator style={{ marginVertical: 4 }} />}
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          editable={!busy}
          onSubmitEditing={send}
        />
        <TouchableOpacity style={styles.button} onPress={send} disabled={busy || !message.trim()}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginTop: 16 },
  heading: { fontWeight: "600", marginBottom: 8 },
  muted: { color: "#888" },
  userTurn: { marginBottom: 4 },
  agentTurn: { marginBottom: 4, color: "#245" },
  error: { color: "#d33" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  button: { justifyContent: "center", paddingHorizontal: 12, backgroundColor: "#245", borderRadius: 6 },
  buttonText: { color: "white", fontWeight: "600" },
});
