import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useMap } from "react-leaflet";
import { ModeToggle } from "./mode-toggle";

export function AppSidebar() {
  const map = useMap();
  return (
    <Sidebar
      onMouseEnter={() => {
        map.scrollWheelZoom.disable();
        map.dragging.disable();
      }}
      onMouseLeave={() => {
        map.scrollWheelZoom.enable();
        map.dragging.enable();
      }}
      className=" h-full z-[1000] left-0 top-0 transform bottom-4 border border-l-0 border-y-0 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-none shadow-md "
      side="left"
      variant="floating"
      collapsible="icon"
    >
      <div className="w-full h-full">
        <SidebarHeader className=" flex justify-between flex-row items-center w-full">
          <p className="text-lg font-medium  text-nowrap overflow-hidden group-data-[collapsible=icon]:hidden">
            Rapid Penang Bus
          </p>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup />
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter>
          <ModeToggle />
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
