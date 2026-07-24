import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { AudioPage } from "./pages/AudioPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ImagePage } from "./pages/ImagePage";
import { MasterPage } from "./pages/MasterPage";

export function App() {
  return (
    <div>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<AudioPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/images" element={<ImagePage />} />
          <Route path="/master" element={<MasterPage />} />
        </Routes>
      </main>
    </div>
  );
}
