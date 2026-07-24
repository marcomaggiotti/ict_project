import { useState } from "react";
import type { ChatResponse } from "../api";

interface Props {
  chat: (message: string) => Promise<ChatResponse>;
  placeholder?: string;
}

interface Turn {
  role: "user" | "agent";
  text: string;
}

export function ChatPanel({ chat, placeholder }: Props) {
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
    <div className="chat-panel">
      <div className="chat-history">
        {turns.length === 0 && <p className="muted">Ask the agent, e.g. "{placeholder}"</p>}
        {turns.map((t, i) => (
          <div key={i} className={`chat-turn chat-${t.role}`}>
            <strong>{t.role === "user" ? "You" : "Agent"}:</strong> {t.text}
          </div>
        ))}
        {busy && <div className="chat-turn chat-agent muted">thinking…</div>}
      </div>
      {error && <p className="error">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !message.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
