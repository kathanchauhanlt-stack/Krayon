import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./components/Home";
import AboutUs from "./components/AboutUs";
import Realm from "./components/Realm";
import Forge from "./components/Forge";
import Guild from "./components/Guild";
import Vault from "./components/Vault";
import HallOfVisions from "./components/HallOfVisions";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<AboutUs />} />
        <Route path="realm" element={<Realm />} />
        <Route path="forge" element={<Forge />} />
        <Route path="guild" element={<Guild />} />
        <Route path="vault" element={<Vault />} />
        <Route path="visions" element={<HallOfVisions />} />
      </Route>
    </Routes>
  );
}
