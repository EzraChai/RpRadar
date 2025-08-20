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
import { Card, CardHeader, CardTitle } from "./ui/card";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { NavLink } from "react-router";
import routes from "@/assets/routes_with_shapes.json";

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
  const [search, setSearch] = useState("");
  const [filteredRoutes, setFilteredRoutes] = useState(routes); // initial list

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = search.trim().toLowerCase();

      const results = routes.filter(
        (bus) =>
          bus.route_code.toLowerCase().includes(term) ||
          bus.route_name.toLowerCase().includes(term)
      );

      setFilteredRoutes(results);
    }, 300); // wait 300ms after user stops typing

    return () => clearTimeout(handler); //
  }, [search]);
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
      className={`absolute w-96 h-full z-[999] left-52 ${
        collapsed && "left-16"
      } duration-200 ease-linear top-0 transform bottom-4 border border-l-0 border-y-0 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-0 py-2 rounded-none shadow-md`}
    >
      <CardHeader className="px-2 flex justify-between items-center w-full">
        <CardTitle className="pl-4 text-2xl font-semibold">Search</CardTitle>
        <Button
          onClick={() => setOpenSearch(false)}
          size={"lg"}
          variant={"ghost"}
        >
          <X />
        </Button>
      </CardHeader>
      <div className="px-4 relative w-full">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          className="pl-10 pr-2 py-2 h-12 !text-lg bg-neutral-50 dark:!bg-neutral-900"
          placeholder="Search Routes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="px-4 h-screen overflow-x-clip overflow-y-auto">
        {filteredRoutes.map((line, index) => (
          <RouteCard
            key={line.route_id}
            index={index}
            length={filteredRoutes.length - 1}
            line={line}
          />
        ))}
      </div>
    </Card>
  );
}

function RouteCard({
  line,
  index,
  length,
}: {
  line: {
    route_id: string;
    route_code: string;
    route_name: string;
    shape_ids: string[];
  };
  index: number;
  length: number;
}) {
  return (
    <NavLink className={"flex justify-center"} to={`/?id=${line.route_id}`} end>
      <Button
        className={`w-full overflow-hidden border-b dark:border-neutral-600 flex justify-between items-center rounded-none py-10 bg-neutral-50 dark:bg-neutral-900
          ${index === 0 && "rounded-t-3xl"}
         ${index === length && "rounded-b-3xl mb-4 border-b-0"}`}
        variant={"ghost"}
      >
        <p className="text-sm pr-4  whitespace-normal text-left break-words dark:text-neutral-50 text-neutral-900">
          {line.route_name}
        </p>
        <div className="w-12 h-6 font-semibold flex justify-center items-center text-sm border-2 border-red-500 rounded-lg text-black dark:text-white">
          {line.route_code}
        </div>
      </Button>
    </NavLink>
  );
}
