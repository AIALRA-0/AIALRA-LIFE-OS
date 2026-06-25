import { RouteCard, type RouteCardRoute } from "@/components/route-card";

export function CurrentRouteBoard({ routes }: { routes: RouteCardRoute[] }) {
  const primary = routes.find((route) => route.domain === "Chip/EDA");
  const others = routes.filter((route) => route.id !== primary?.id);

  return (
    <div className="space-y-4">
      {primary ? <RouteCard route={primary} /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {others.map((route) => (
          <RouteCard key={route.id} route={route} compact />
        ))}
      </div>
    </div>
  );
}
