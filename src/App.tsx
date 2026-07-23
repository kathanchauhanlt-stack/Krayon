import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./components/Home";
import Stream from "./components/Stream";
import Studio from "./components/Studio";
import Vault from "./components/Vault";
import Profile from "./components/Profile";
import Reader from "./components/Reader";
import LabReader from "./components/LabReader";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="stream"  element={<Stream />} />
          <Route path="studio"  element={<Studio />} />
          <Route path="vault"   element={<Vault />} />
          <Route path="profile" element={<Profile />} />
          <Route path="reader"  element={<Reader />} />
          <Route path="reader/:id" element={<Reader />} />
          <Route path="lab"     element={<LabReader />} />
          <Route path="lab/:projectId" element={<LabReader />} />

          {/* Legacy route redirects */}
          <Route path="realm"   element={<Navigate to="/stream"  replace />} />
          <Route path="forge"   element={<Navigate to="/studio"  replace />} />
          <Route path="guild"   element={<Navigate to="/profile" replace />} />
          <Route path="visions" element={<Navigate to="/reader"  replace />} />
          <Route path="about"   element={<Navigate to="/"        replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
