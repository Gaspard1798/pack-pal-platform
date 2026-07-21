import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ListChecks, Archive, Plus, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/informations")({
  head: () => ({ meta: [{ title: "Informations chantier — Fluxop" }] }),
  component: InformationsLayout,
});

const tabs = [
  { to: "/informations", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/informations/actives", label: "Actives", icon: ListChecks },
  { to: "/informations/archives", label: "Archives", icon: Archive },
  { to: "/informations/parametres", label: "Paramètres", icon: Settings },
];

function InformationsLayout() {
  const { roles } = useAuth();
  const canPublish =
    roles.includes("admin") || roles.includes("conducteur");
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Informations chantier
          </h1>
          <p className="text-sm text-muted-foreground">
            Diffusez et consultez les communications générales du chantier.
          </p>
        </div>
        {canPublish && (
          <Link to="/informations/nouvelle">
            <Button>
              <Plus className="size-4" /> Nouvelle publication
            </Button>
          </Link>
        )}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => {
          const active = t.exact
            ? path === t.to
            : path === t.to || path.startsWith(t.to + "/");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
