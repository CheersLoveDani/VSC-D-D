import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./routes/HomePage";
import CharacterPage from "./routes/CharacterPage";
import MapPage from "./routes/MapPage";
import ItemPage from "./routes/ItemPage";
import StatBlockPage from "./routes/StatBlockPage";
import SpellPage from "./routes/SpellPage";
import CompendiumPage from "./routes/CompendiumPage";
import SettingsPage from "./routes/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="character" element={<CharacterPage />} />
        <Route path="character/:id" element={<CharacterPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="map/:id" element={<MapPage />} />
        <Route path="item" element={<ItemPage />} />
        <Route path="item/:id" element={<ItemPage />} />
        <Route path="statblock" element={<StatBlockPage />} />
        <Route path="statblock/:id" element={<StatBlockPage />} />
        <Route path="spell" element={<SpellPage />} />
        <Route path="spell/:id" element={<SpellPage />} />
        <Route path="compendium" element={<CompendiumPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
