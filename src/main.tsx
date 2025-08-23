import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import "./index.css";
import Map from "./components/Map.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { SidebarProvider } from "@/components/ui/sidebar";
import { StarredRoutesProvider } from "./hooks/use-starred-routes.tsx";
import { Analytics } from "@vercel/analytics/next";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SidebarProvider>
        <StarredRoutesProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Map />} />
            </Routes>
          </BrowserRouter>
        </StarredRoutesProvider>
      </SidebarProvider>
    </ThemeProvider>
    <Analytics />
  </StrictMode>
);
