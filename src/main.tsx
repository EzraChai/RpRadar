import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import "./index.css";
import Map from "./components/Map.tsx";
import SelectRoute from "./components/SelectRoute.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SelectRoute />} />
          <Route index path="/map" element={<Map />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
