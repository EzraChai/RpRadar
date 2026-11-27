import { useEffect } from "react";
import { Capacitor, SystemBars } from "@capacitor/core";

export function ImmersiveMap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void SystemBars.hide();

    return () => {
      void SystemBars.show();
    };
  }, []);

  return null;
}
