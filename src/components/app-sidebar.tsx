import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useMap } from "react-leaflet";
import { ModeToggle } from "./mode-toggle";
import { Search, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useState } from "react";
import { Input } from "./ui/input";

export function AppSidebar() {
  const map = useMap();
  const [openSearch, setOpenSearch] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <Sidebar
        onMouseEnter={() => {
          map.scrollWheelZoom.disable();
          map.dragging.disable();
          map.doubleClickZoom.disable();
        }}
        onMouseLeave={() => {
          map.scrollWheelZoom.enable();
          map.dragging.enable();
          map.doubleClickZoom.enable();
        }}
        className=" overflow-hidden w-52 h-full z-[1000] left-0 top-0 transform bottom-4 border border-l-0 border-y-0 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-none shadow-md "
        side="left"
        variant="floating"
        collapsible="icon"
      >
        <div className="w-full flex flex-col flex-between">
          <SidebarHeader className=" flex justify-between flex-row items-center w-full">
            <p className="text-lg font-medium  text-nowrap overflow-hidden group-data-[collapsible=icon]:hidden">
              Rapid Penang
            </p>
            <SidebarTrigger onClick={() => setCollapsed((prev) => !prev)} />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenSearch(true)} asChild>
                  <div className="flex ">
                    <Search className="w-24 h-24" />
                    <span className="text-xl">Search</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroup>

            <SidebarGroup />
          </SidebarContent>
          <SidebarFooter className="flex items-end">
            <ModeToggle />
          </SidebarFooter>
        </div>
      </Sidebar>
      <SearchSideBar
        collapsed={collapsed}
        openSearch={openSearch}
        setOpenSearch={setOpenSearch}
      />
    </>
  );
}

function SearchSideBar({
  collapsed,
  openSearch,
  setOpenSearch,
}: {
  collapsed: boolean;
  openSearch: boolean;
  setOpenSearch: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const map = useMap();

  return (
    <Card
      hidden={!openSearch}
      onMouseEnter={() => {
        map.scrollWheelZoom.disable();
        map.dragging.disable();
        map.doubleClickZoom.disable();
      }}
      onMouseLeave={() => {
        map.scrollWheelZoom.enable();
        map.dragging.enable();
        map.doubleClickZoom.enable();
      }}
      className={` absolute w-96 h-full z-[999] left-52 ${
        collapsed && "left-16"
      } duration-200 ease-linear top-0 transform bottom-4 border border-l-0 border-y-0 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-none shadow-md`}
    >
      <CardHeader className="px-0 flex justify-between items-center w-full">
        <CardTitle className="pl-4 text-2xl font-semibold">Search</CardTitle>
        <Button
          onClick={() => setOpenSearch(false)}
          size={"lg"}
          variant={"ghost"}
        >
          <X />
        </Button>
      </CardHeader>
      <CardContent className="w-full">
        <Input />
      </CardContent>
    </Card>
  );
}
