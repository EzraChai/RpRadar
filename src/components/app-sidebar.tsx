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
import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Link, NavLink } from "react-router";
import { useStarredRoutes } from "@/hooks/use-starred-routes";
import { useIsMobile } from "@/hooks/use-mobile";
import RpRadarIcon from "@/assets/RpRadar.png";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import RapidPenangRoutes from "@/assets/rp/rp_routes_with_shapes.json";
import RapidKLRoutes from "@/assets/rkl/rkl_routes_with_shapes.json";

export function AppSidebar() {
  const map = useMap();
  const [openSearch, setOpenSearch] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [provider, setProvider] = useState<string>(() => {
    return localStorage.getItem("provider") || "rp";
  });

  const [savedRoutes, setSavedRoutes] = useState<
    (
      | {
          route_id: string;
          route_code: string;
          route_name: string;
          shape_ids: string[];
        }
      | undefined
    )[]
  >([]);

  const { starred } = useStarredRoutes();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  let routes = null;
  switch (provider) {
    case "rp":
      routes = RapidPenangRoutes as unknown as {
        type: "FeatureCollection";
        features: {
          type: "Feature";
          properties: {
            route_id: string;
            route_code: string;
            route_name: string;
            shape_ids: string[];
          };
        }[];
      };
      break;
    case "rkl":
      routes = RapidKLRoutes as unknown as {
        type: "FeatureCollection";
        features: {
          type: "Feature";
          properties: {
            route_id: string;
            route_code: string;
            route_name: string;
            shape_ids: string[];
          };
        }[];
      };
      break;
  }

  useEffect(() => {
    if (!routes) {
      setSavedRoutes([]);
      return;
    }

    // If routes is a FeatureCollection, extract the properties array; otherwise assume it's already an array of route objects.
    const routeList: {
      route_id: string;
      route_code: string;
      route_name: string;
      shape_ids: string[];
    }[] =
      Array.isArray((routes as any).features) && (routes as any).features.length
        ? (routes as any).features.map((f: any) => f.properties)
        : (routes as any as {
            route_id: string;
            route_code: string;
            route_name: string;
            shape_ids: string[];
          }[]);

    setSavedRoutes(starred.map((s) => routeList.find((r) => r.route_id === s)));
  }, [starred, provider]);

  if (!isMobile)
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
          className=" overflow-hidden w-52 h-full z-1000 left-0 top-0 transform bottom-4 border border-l-0 border-y-0 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-none shadow-md "
          side="left"
          variant="floating"
          collapsible="icon"
        >
          <div className="w-full flex flex-col flex-between">
            <SidebarHeader className=" flex justify-between flex-row items-center w-full">
              <div
                className={`flex flex-row gap-1 items-center justify-center ${
                  collapsed ? "hidden" : "block"
                }`}
              >
                <img
                  className={`w-8 h-8 object-cover border border-white dark:border-neutral-500 rounded-lg ${
                    collapsed ? "hidden" : "block"
                  }`}
                  src={RpRadarIcon}
                  alt="logo of RPRadar"
                />

                <h2
                  className={`font-bold font-serif text-lg whitespace-nowrap ${
                    collapsed ? "hidden" : "block"
                  }`}
                >
                  <span className="text-red-600 dark:text-red-500">Rp</span>
                  Radar
                </h2>
              </div>

              <SidebarTrigger
                className="hover:cursor-pointer"
                onClick={() => setCollapsed((prev) => !prev)}
              />
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenuItem className="mt-1 pl-2">
                <SidebarMenuButton
                  className={`hover:cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 `}
                  onClick={() => {
                    setOpenSearch((prev) => !prev && true);
                    setTimeout(() => {
                      if (inputRef.current) {
                        inputRef.current.focus(); // 👈 focus input when icon clicked
                      }
                    }, 0);
                  }}
                  asChild
                >
                  <div
                    className={`w-8 h-8 flex items-baseline ${
                      openSearch
                        ? "bg-neutral-50 dark:bg-neutral-700"
                        : "bg-transparent"
                    }`}
                  >
                    <Search className={"w-4 h-4 text-black dark:text-white"} />
                    <span className="text-lg">Search</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {savedRoutes.length > 0 && (
                <SidebarGroup>
                  <div
                    className={`mt-4 h-4 w-full text-neutral-500 dark:text-neutral-400 text-nowrap `}
                  >
                    <p className={`${collapsed ? "hidden" : "block"}`}>
                      Saved Routes
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    {savedRoutes.map((route) => (
                      <Link
                        key={route?.route_id}
                        className=" flex items-center gap-2"
                        to={`/?id=${route?.route_id}`}
                        preventScrollReset
                      >
                        <Button
                          variant={"ghost"}
                          key={route?.route_id}
                          className="text-[10px] cursor-pointer flex justify-center items-center font-bold border-[1.7px] w-9 h-5 py-1 px-1 border-red-500 rounded-xl"
                        >
                          <p className="text-black dark:text-white truncate">
                            {route?.route_code}
                          </p>
                        </Button>
                        <p className="dark:text-white text-black truncate ">
                          {route?.route_name}
                        </p>
                      </Link>
                    ))}
                  </div>
                </SidebarGroup>
              )}
            </SidebarContent>
            <SidebarFooter>
              <div className="flex justify-end">
                <ModeToggle />
              </div>
              <SidebarMenuButton asChild>
                <Select
                  onValueChange={(value) => {
                    setProvider(value);
                    localStorage.setItem("provider", value);
                    window.history.replaceState(
                      {},
                      "",
                      window.location.pathname,
                    );
                    window.location.reload();
                  }}
                  value={provider}
                >
                  <SelectTrigger className="w-full mb-2">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent className="z-1002 border-0 backdrop-blur-lg bg-white/50 dark:bg-white/10">
                    <SelectItem value="rp"> Penang</SelectItem>
                    <SelectItem value="rkl"> Selangor/KL</SelectItem>
                  </SelectContent>
                </Select>
              </SidebarMenuButton>
              <div className="flex justify-center w-full h-4">
                <p
                  className={`whitespace-nowrap overflow-hidden text-xs text-neutral-400 ${
                    collapsed ? "hidden " : "block "
                  }`}
                >
                  Made with ❤️ by
                  <a
                    className="ml-1 dark:text-neutral-300! text-neutral-500! hover:underline underline-offset-2"
                    target="_blank"
                    href="https://ezrachai-links.vercel.app/"
                  >
                    ezrachai
                  </a>
                </p>
              </div>
            </SidebarFooter>
          </div>
        </Sidebar>
        <SearchSideBar
          collapsed={collapsed}
          openSearch={openSearch}
          setOpenSearch={setOpenSearch}
          inputRef={inputRef}
        />
      </>
    );

  return <></>;
}

function SearchSideBar({
  collapsed,
  openSearch,
  setOpenSearch,
  inputRef,
}: {
  collapsed: boolean;
  openSearch: boolean;
  setOpenSearch: React.Dispatch<React.SetStateAction<boolean>>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [provider] = useState<string>(() => {
    return localStorage.getItem("provider") || "rp";
  });

  let routes = null;
  if (provider === "rp") {
    routes = RapidPenangRoutes as unknown as {
      features: {
        properties: {
          route_id: string;
          route_code: string;
          route_name: string;
          shape_ids: string[];
        };
      }[];
    };
  } else if (provider === "rkl") {
    routes = RapidKLRoutes as unknown as {
      features: {
        properties: {
          route_id: string;
          route_code: string;
          route_name: string;
          shape_ids: string[];
        };
      }[];
    };
  }
  const map = useMap();
  const [search, setSearch] = useState("");
  const [filteredRoutes, setFilteredRoutes] = useState(() => {
    if (!routes) return [];
    if (
      Array.isArray((routes as any).features) &&
      (routes as any).features.length
    ) {
      return (routes as any).features.map((f: any) => f.properties);
    }
    if (Array.isArray(routes)) {
      return routes as any;
    }
    return [];
  }); // initial list

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = search.trim().toLowerCase();

      // derive a safe list to filter from (supports FeatureCollection or plain array)
      const list =
        routes &&
        Array.isArray((routes as any).features) &&
        (routes as any).features.length
          ? (routes as any).features.map((f: any) => f.properties)
          : Array.isArray(routes)
            ? (routes as any)
            : [];

      const results = list.filter(
        (bus: any) =>
          bus.route_code.toLowerCase().includes(term) ||
          bus.route_name.toLowerCase().includes(term),
      );

      setFilteredRoutes(results);
    }, 300); // wait 300ms after user stops typing

    return () => clearTimeout(handler); //
  }, [search, routes]);
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
      className={`absolute w-96 h-full z-999 left-52 ${
        collapsed && "left-16"
      } duration-200 ease-linear top-0 transform bottom-4 border border-l-0 border-y-0 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-0 py-2 rounded-none shadow-md`}
    >
      <CardHeader className="px-2 flex justify-between items-center w-full">
        <CardTitle className="pl-4 text-2xl font-semibold">Search</CardTitle>
        <Button
          className="rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
          onClick={() => setOpenSearch(false)}
          size={"lg"}
          variant={"ghost"}
        >
          <X />
        </Button>
      </CardHeader>
      <div className="px-4 relative w-full">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <Input
          ref={inputRef}
          className="pl-10 pr-2 py-2 h-12 text-lg! bg-neutral-50 dark:bg-neutral-900!"
          placeholder="Search Routes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="px-4 h-screen overflow-x-clip overflow-y-auto">
        {filteredRoutes.map(
          (
            line: {
              route_id: any;
              route_code?: string;
              route_name?: string;
              shape_ids?: string[];
            },
            index: number,
          ) => (
            <RouteCard
              key={line.route_id}
              index={index}
              length={filteredRoutes.length}
              line={line}
              setOpenSearch={setOpenSearch}
            />
          ),
        )}
      </div>
    </Card>
  );
}

export function RouteCard({
  line,
  index,
  length,
  setSnap,
  setOpenSearch,
}: {
  line: {
    route_id: string | number;
    route_code?: string;
    route_name?: string;
    shape_ids?: string[];
  };
  index: number;
  length: number;
  setSnap?: React.Dispatch<React.SetStateAction<string | number | null>>;
  setOpenSearch?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <NavLink
      onClick={() => {
        if (typeof setSnap === "function") {
          setSnap(0.2);
          scrollTo();
        }
        if (typeof setOpenSearch === "function") {
          setTimeout(() => {
            setOpenSearch(false);
          }, 50);
        }
      }}
      className={"flex justify-center"}
      to={`/?id=${line.route_id}`}
      onPointerDownCapture={(e) => e.stopPropagation()}
    >
      <Button
        className={`w-full dark:hover:bg-neutral-700 cursor-pointer overflow-hidden border-b dark:border-neutral-600 flex justify-between items-center rounded-none py-10 bg-neutral-50 dark:bg-neutral-900
          ${index === 0 && "rounded-t-3xl"}
         ${index === length - 1 && "rounded-b-3xl mb-4 border-b-0"}`}
        variant={"ghost"}
      >
        <p className="text-sm pr-4 whitespace-normal text-left wrap-break-word dark:text-neutral-50 text-neutral-900">
          {line.route_name ?? ""}
        </p>
        <div className="min-w-12 px-1 h-6 font-semibold flex justify-center items-center text-sm border-2 border-red-500 rounded-lg text-black dark:text-white">
          {line.route_code ?? ""}
        </div>
      </Button>
    </NavLink>
  );
}
