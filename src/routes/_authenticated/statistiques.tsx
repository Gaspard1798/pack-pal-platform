import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Clock, AlertTriangle, CheckCircle2, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/statistiques")({
  head: () => ({ meta: [{ title: "Statistiques terrain — Fluxop" }] }),
  component: StatistiquesPage,
});

type Chantier = { id: string; nom: string };
type Aire = { id: string; nom: string };
type Demande = {
  id: string; aire_id: string | null; debut: string; duree_min: number;
  nature: string; prestataire_id: string; statut: string;
};
type Venue = {
  id: string; demande_id: string; arrivee_reelle: string | null;
  depart_reel: string | null; non_conformites: string[] | null;
};
type DemandeMat = { demande_id: string; materiel_id: string; quantite: number };
type Materiel = { id: string; nom: string; type: string | null };
type Entreprise = { id: string; nom: string };
type Profile = { id: string; entreprise_id: string | null; full_name: string | null; email: string };

const RETARD_SEUIL_MIN = 15;

function StatistiquesPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantierId, setChantierId] = useState<string>("");
  const [days, setDays] = useState<number>(30);
  const [aires, setAires] = useState<Aire[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("chantiers").select("id,nom").order("nom").then(({ data }) => {
      const list = (data ?? []) as Chantier[];
      setChantiers(list);
      if (list.length && !chantierId) setChantierId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!chantierId) return;
    setLoading(true);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    (async () => {
      const [{ data: aireData }, { data: demandeData }] = await Promise.all([
        supabase.from("aires").select("id,nom").eq("chantier_id", chantierId).order("nom"),
        supabase.from("demandes").select("id,aire_id,debut,duree_min,nature,prestataire_id")
          .eq("chantier_id", chantierId).gte("debut", since).order("debut"),
      ]);
      setAires((aireData ?? []) as Aire[]);
      const dem = (demandeData ?? []) as Demande[];
      setDemandes(dem);
      const ids = dem.map((d) => d.id);
      if (ids.length) {
        const { data: vData } = await supabase
          .from("venues")
          .select("id,demande_id,arrivee_reelle,depart_reel,non_conformites")
          .in("demande_id", ids);
        setVenues((vData ?? []) as Venue[]);
      } else setVenues([]);
      setLoading(false);
    })();
  }, [chantierId, days]);

  const demandeById = useMemo(
    () => new Map(demandes.map((d) => [d.id, d])),
    [demandes],
  );

  const stats = useMemo(() => {
    const checkedIn = venues.filter((v) => v.arrivee_reelle);
    let retards = 0;
    let totalRetardMin = 0;
    let aLheure = 0;
    let nbNC = 0;
    const ncByType = new Map<string, number>();
    const byAire = new Map<string, { venues: number; nc: number; retards: number }>();

    for (const v of checkedIn) {
      const d = demandeById.get(v.demande_id);
      if (!d) continue;
      const planned = new Date(d.debut).getTime();
      const actual = new Date(v.arrivee_reelle!).getTime();
      const delayMin = Math.round((actual - planned) / 60000);
      const isRetard = delayMin > RETARD_SEUIL_MIN;
      if (isRetard) { retards++; totalRetardMin += delayMin; } else aLheure++;

      const ncs = v.non_conformites ?? [];
      if (ncs.length > 0) nbNC++;
      for (const nc of ncs) ncByType.set(nc, (ncByType.get(nc) ?? 0) + 1);

      const aireKey = d.aire_id ?? "_none";
      const agg = byAire.get(aireKey) ?? { venues: 0, nc: 0, retards: 0 };
      agg.venues++;
      if (ncs.length > 0) agg.nc++;
      if (isRetard) agg.retards++;
      byAire.set(aireKey, agg);
    }

    const totalCheck = checkedIn.length;
    return {
      totalCheck,
      planifiees: demandes.length,
      tauxPonctualite: totalCheck ? Math.round((aLheure / totalCheck) * 100) : 0,
      retardMoyen: retards ? Math.round(totalRetardMin / retards) : 0,
      nbRetards: retards,
      tauxNC: totalCheck ? Math.round((nbNC / totalCheck) * 100) : 0,
      nbNC,
      ncByType: [...ncByType.entries()].map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n),
      byAire: [...byAire.entries()].map(([k, v]) => ({
        aire: k === "_none" ? "Sans aire" : (aires.find((a) => a.id === k)?.nom ?? "—"),
        ...v,
      })).sort((a, b) => b.venues - a.venues),
    };
  }, [venues, demandeById, demandes, aires]);

  const kpis = [
    { label: "Venues enregistrées", value: stats.totalCheck, hint: `sur ${stats.planifiees} planifiées`, icon: CheckCircle2 },
    { label: "Ponctualité", value: `${stats.tauxPonctualite}%`, hint: `${stats.nbRetards} retard(s) > ${RETARD_SEUIL_MIN} min`, icon: Clock },
    { label: "Retard moyen", value: `${stats.retardMoyen} min`, hint: "sur les venues en retard", icon: Timer },
    { label: "Taux de non-conformité", value: `${stats.tauxNC}%`, hint: `${stats.nbNC} venue(s) concernée(s)`, icon: AlertTriangle },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Statistiques terrain</h1>
        <p className="text-sm text-muted-foreground">
          Ponctualité, retards et non-conformités sur les venues enregistrées.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Chantier</Label>
          <select value={chantierId} onChange={(e) => setChantierId(e.target.value)}
            className="flex h-9 min-w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Période</Label>
          <div className="flex rounded-md border border-input p-0.5">
            {[7, 30, 90].map((d) => (
              <Button key={d} size="sm" variant={days === d ? "default" : "ghost"}
                className="h-8" onClick={() => setDays(d)}>
                {d} j
              </Button>
            ))}
          </div>
        </div>
      </div>

      {!chantierId ? (
        <p className="text-sm text-muted-foreground">Aucun chantier accessible.</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : stats.totalCheck === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune venue enregistrée sur cette période.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{k.label}</span>
                  <k.icon className="h-4 w-4 text-accent" />
                </div>
                <div className="mt-3 font-display text-3xl font-semibold">{k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k.hint}</div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Non-conformités par type</CardTitle></CardHeader>
              <CardContent>
                {stats.ncByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune non-conformité 🎉</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.ncByType} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} className="text-xs" />
                      <YAxis type="category" dataKey="type" width={120} className="text-xs" />
                      <Tooltip cursor={{ fill: "var(--muted)" }} />
                      <Bar dataKey="n" name="Occurrences" radius={[0, 4, 4, 0]} fill="var(--destructive)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Venues par aire</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.byAire}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="aire" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="venues" name="Venues" radius={[4, 4, 0, 0]} fill="var(--accent)" />
                    <Bar dataKey="nc" name="Non-conformités" radius={[4, 4, 0, 0]} fill="var(--destructive)" />
                    <Bar dataKey="retards" name="Retards" radius={[4, 4, 0, 0]}>
                      {stats.byAire.map((_, i) => <Cell key={i} fill="var(--primary)" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
