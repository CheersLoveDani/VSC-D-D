import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./routes/HomePage";
import CharacterPage from "./routes/CharacterPage";
import CompendiumPage from "./routes/CompendiumPage";
import SettingsPage from "./routes/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="character" element={<CharacterPage />} />
        <Route path="character/:id" element={<CharacterPage />} />
        <Route path="compendium" element={<CompendiumPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
