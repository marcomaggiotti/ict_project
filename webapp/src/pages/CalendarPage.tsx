import { useEffect, useState } from "react";
import { calendarApi, type CalendarEvent } from "../api";
import { ChatPanel } from "../components/ChatPanel";

interface FormState {
  title: string;
  start_time: string;
  end_time: string;
  kind: "event" | "reservation";
  resource: string;
}

const empty: FormState = { title: "", start_time: "", end_time: "", kind: "event", resource: "" };

export function CalendarPage() {
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  async function refresh() {
    try {
      const data = await calendarApi.list();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    try {
      await calendarApi.create({
        title: form.title,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        kind: form.kind,
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
      await calendarApi.cancel(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <h1>Calendar &amp; Reservations</h1>
      {error && <p className="error">{error}</p>}

      <div className="form-grid">
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "event" | "reservation" })}>
          <option value="event">Event</option>
          <option value="reservation">Reservation</option>
        </select>
        {form.kind === "reservation" && (
          <input
            placeholder="Resource (e.g. conference-room-a)"
            value={form.resource}
            onChange={(e) => setForm({ ...form, resource: e.target.value })}
          />
        )}
        <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        <button onClick={handleCreate}>Create</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Kind</th>
            <th>Resource</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.kind}</td>
              <td>{item.resource}</td>
              <td>{new Date(item.start_time).toLocaleString()}</td>
              <td>{new Date(item.end_time).toLocaleString()}</td>
              <td>{item.status}</td>
              <td>
                {item.status === "confirmed" && <button onClick={() => handleCancel(item.id)}>Cancel</button>}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No events yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Agent</h2>
      <ChatPanel chat={calendarApi.chat} placeholder="book conference-room-a tomorrow 2-3pm" />
    </div>
  );
}
