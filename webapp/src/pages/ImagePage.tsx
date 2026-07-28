import { useEffect, useRef, useState } from "react";
import { imageApi, type FileMeta } from "../api";
import { ChatPanel } from "../components/ChatPanel";

export function ImagePage() {
  const [items, setItems] = useState<FileMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const data = await imageApi.list();
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
      await imageApi.upload(file);
      if (fileInput.current) fileInput.current.value = "";
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await imageApi.remove(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <h1>Image Files</h1>
      {error && <p className="error">{error}</p>}
      <div className="toolbar">
        <input ref={fileInput} type="file" accept="image/*" />
        <button onClick={handleUpload}>Upload</button>
      </div>
      <div className="image-grid">
        {items.map((item) => (
          <figure key={item.id} className="image-card">
            <img src={imageApi.downloadUrl(item.id)} alt={item.filename} />
            <figcaption>
              {item.filename}
              <button onClick={() => handleDelete(item.id)}>Delete</button>
            </figcaption>
          </figure>
        ))}
        {items.length === 0 && <p className="muted">No images yet.</p>}
      </div>

      <h2>Agent</h2>
      <ChatPanel chat={imageApi.chat} placeholder="how many images are stored right now?" />
    </div>
  );
}
