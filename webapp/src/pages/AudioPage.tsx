import { useEffect, useRef, useState } from "react";
import { audioApi, type FileMeta } from "../api";
import { ChatPanel } from "../components/ChatPanel";

export function AudioPage() {
  const [items, setItems] = useState<FileMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const data = await audioApi.list();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    try {
      await audioApi.upload(file);
      if (fileInput.current) fileInput.current.value = "";
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await audioApi.remove(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <h1>Audio Files</h1>
      {error && <p className="error">{error}</p>}
      <div className="toolbar">
        <input ref={fileInput} type="file" accept="audio/*" />
        <button onClick={handleUpload}>Upload</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Type</th>
            <th>Size</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <a href={audioApi.downloadUrl(item.id)}>{item.filename}</a>
              </td>
              <td>{item.content_type}</td>
              <td>{(item.size_bytes / 1024).toFixed(1)} KB</td>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => handleDelete(item.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No audio files yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Agent</h2>
      <ChatPanel chat={audioApi.chat} placeholder="list the audio files uploaded today" />
    </div>
  );
}
