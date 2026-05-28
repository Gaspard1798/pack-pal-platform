import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, Truck, Calendar, ClipboardCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

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

type DemandeLite = { id: string; statut: string; debut: string };

const STATUT_LABEL: Record<string, string> = {
  en_cours: "En cours",
  acceptee: "Acceptée",
  modifiee: "Modifiée",
  refusee: "Refusée",
  terminee: "Terminée",
  annulee: "Annulée",
};

const STATUT_FILL: Record<string, string> = {
  en_cours: "var(--accent)",
  acceptee: "var(--primary)",
  modifiee: "var(--chart-3, var(--accent))",
  refusee: "var(--destructive)",
  terminee: "var(--muted-foreground)",
  annulee: "var(--border)",
};

function toISODate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function Dashboard() {
  const { user, roles } = useAuth();
  const primary = roles[0];
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [demandes, setDemandes] = useState<DemandeLite[]>([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    (async () => {
      const [c, attente, jour, nc, dem] = await Promise.all([
        supabase.from("chantiers").select("id", { count: "exact", head: true }).eq("actif", true),
        supabase.from("demandes").select("id", { count: "exact", head: true }).eq("statut", "en_cours"),
        supabase.from("demandes").select("id", { count: "exact", head: true })
          .gte("debut", dayStart.toISOString()).lt("debut", dayEnd.toISOString()),
        supabase.from("venues").select("non_conformites,created_at")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("demandes").select("id,statut,debut")
          .gte("debut", sevenDaysAgo.toISOString()),
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
      setDemandes((dem.data ?? []) as DemandeLite[]);
    })();
  }, [user]);

  const items = [
    { label: "Chantiers actifs", value: kpis?.chantiersActifs, hint: "Vos chantiers en cours", icon: HardHat, to: "/chantiers" },
    { label: "Demandes en attente", value: kpis?.demandesEnAttente, hint: "À valider", icon: Truck, to: "/demandes" },
    { label: "Créneaux aujourd'hui", value: kpis?.creneauxAujourdhui, hint: "Sur tous chantiers", icon: Calendar, to: "/planning" },
    { label: "Non-conformités", value: kpis?.nonConformites7j, hint: "7 derniers jours", icon: ClipboardCheck, to: "/terrain" },
  ];

  const statutData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of demandes) counts.set(d.statut, (counts.get(d.statut) ?? 0) + 1);
    return [...counts.entries()]
      .map(([statut, n]) => ({ statut, label: STATUT_LABEL[statut] ?? statut, n }))
      .sort((a, b) => b.n - a.n);
  }, [demandes]);

  // Charge des 7 prochains jours.
  const chargeData = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const buckets: { jour: string; key: string; n: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
      buckets.push({
        key: toISODate(d),
        jour: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
        n: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const d of demandes) {
      const k = toISODate(new Date(d.debut));
      const b = byKey.get(k);
      if (b) b.n++;
    }
    return buckets;
  }, [demandes]);

  return (
    <div className="p-6 space-y-6">
      <div>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Charge des 7 prochains jours</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chargeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="jour" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="n" name="Créneaux" radius={[4, 4, 0, 0]} fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Demandes par statut (30 j)</CardTitle></CardHeader>
          <CardContent>
            {statutData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune demande récente.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statutData} dataKey="n" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {statutData.map((d) => (
                      <Cell key={d.statut} fill={STATUT_FILL[d.statut] ?? "var(--muted-foreground)"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
