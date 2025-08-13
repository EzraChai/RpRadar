import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import routes from "@/assets/routes.json";
import { ModeToggle } from "./mode-toggle";
import { NavLink } from "react-router";

export default function SelectRoute() {
  const [filteredRoutes, setFilteredRoutes] = useState(routes); // initial list
  const [search, setSearch] = useState("");

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
  }, [search, routes]);

  return (
    <div className="bg-background max-w-xl mx-auto">
      <div className="p-2 w-full flex justify-between">
        <div className=""></div>
        <ModeToggle />
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="w-48">
          <img src="/logo.png" alt="Rapid-Penang Logo" />
        </div>
      </div>
      <div className="grid w-full items-center gap-3">
        <Label htmlFor="search">Search Route</Label>
        <Input
          id="search"
          placeholder="Search Route"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="mt-12 flex flex-col gap-4">
        {filteredRoutes.map((line) => (
          <RouteCard line={line} />
        ))}
      </div>
    </div>
  );
}

function RouteCard({
  line,
}: {
  line: {
    route_id: string;
    route_code: string;
    route_name: string;
    shape_id: string;
  };
}) {
  return (
    <NavLink to={`/map?code=${line.route_code}&shape_id=${line.shape_id}`} end>
      <div className="bg-white border dark:bg-neutral-900 rounded-2xl p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800">
        <div className="flex justify-between items-center gap-4">
          <div className="text-2xl font-bold border-2 p-2 border-red-500 rounded-xl">
            {line.route_code}
          </div>

          <div>
            <h4 className="font-semibold">{line.route_name}</h4>
          </div>
          <div className="text-2xl font-bold border-2 p-2 border-red-500 rounded-xl">
            {line.route_code}
          </div>
        </div>
      </div>
    </NavLink>
  );
}
