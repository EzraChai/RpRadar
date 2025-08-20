import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type StarredContextType = {
  starred: string[];
  toggle: (routeId: string) => void;
};

const StarredRoutesContext = createContext<StarredContextType | null>(null);

export function StarredRoutesProvider({ children }: { children: ReactNode }) {
  const [starred, setStarred] = useState<string[]>([]);

  // Load from localStorage once
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("starredRoutes") || "[]");
    setStarred(saved);
  }, []);

  const toggle = (routeId: string) => {
    setStarred((prev) => {
      let updated;
      if (prev.includes(routeId)) {
        updated = prev.filter((id) => id !== routeId);
      } else {
        updated = [...prev, routeId];
      }
      localStorage.setItem("starredRoutes", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <StarredRoutesContext.Provider value={{ starred, toggle }}>
      {children}
    </StarredRoutesContext.Provider>
  );
}

export function useStarredRoutes() {
  const ctx = useContext(StarredRoutesContext);
  if (!ctx) throw new Error("useStarredRoutes must be inside provider");
  return ctx;
}
