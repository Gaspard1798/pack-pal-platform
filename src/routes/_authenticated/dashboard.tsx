import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { HardHat, Truck, Calendar, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Fluxop" }] }),
  component: Dashboard,
});

type Kpis = {
  chantiersActifs: number;
  demandesEnAttente: number;
  creneauxAujourdhui: number;
  nonConformites7j: number;
};

function Dashboard() {
  const { user, roles } = useAuth();
  const primary = roles[0];
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    (async () => {
      const [c, attente, jour, nc] = await Promise.all([
        supabase.from("chantiers").select("id", { count: "exact", head: true }).eq("actif", true),
        supabase.from("demandes").select("id", { count: "exact", head: true }).eq("statut", "en_cours"),
        supabase.from("demandes").select("id", { count: "exact", head: true })
          .gte("debut", dayStart.toISOString()).lt("debut", dayEnd.toISOString()),
        supabase.from("venues").select("non_conformites,created_at")
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      const ncCount = (nc.data ?? []).filter(
        (v: { non_conformites: string[] | null }) =>
          Array.isArray(v.non_conformites) && v.non_conformites.length > 0,
      ).length;

      setKpis({
        chantiersActifs: c.count ?? 0,
        demandesEnAttente: attente.count ?? 0,
        creneauxAujourdhui: jour.count ?? 0,
        nonConformites7j: ncCount,
      });
    })();
  }, [user]);

  const items = [
    { label: "Chantiers actifs", value: kpis?.chantiersActifs, hint: "Vos chantiers en cours", icon: HardHat, to: "/chantiers" },
    { label: "Demandes en attente", value: kpis?.demandesEnAttente, hint: "À valider", icon: Truck, to: "/demandes" },
    { label: "Créneaux aujourd'hui", value: kpis?.creneauxAujourdhui, hint: "Sur tous chantiers", icon: Calendar, to: "/planning" },
    { label: "Non-conformités", value: kpis?.nonConformites7j, hint: "7 derniers jours", icon: ClipboardCheck, to: "/terrain" },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Bonjour</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email}
          {primary && <> · {ROLE_LABELS[primary]}</>}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((k) => (
          <Link key={k.label} to={k.to} className="group">
            <Card className="p-5 transition-colors group-hover:border-accent">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-accent" />
              </div>
              <div className="mt-3 font-display text-3xl font-semibold">
                {kpis === null ? "—" : k.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{k.hint}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
