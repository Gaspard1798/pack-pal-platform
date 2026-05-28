import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Wrench, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/planning")({
  component: PlanningPage,
});

type Chantier = { id: string; nom: string };
type Aire = { id: string; nom: string; capacite: number; chantier_id: string };
type Materiel = { id: string; nom: string; quantite: number; chantier_id: string };
type Demande = {
  id: string; chantier_id: string; aire_id: string | null; debut: string;
  duree_min: number; nature: string; statut: string; prestataire_id: string;
};
type DemandeMat = { demande_id: string; materiel_id: string; quantite: number };

const STATUT_COLOR: Record<string, string> = {
  en_cours: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  acceptee: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  modifiee: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  terminee: "bg-muted text-muted-foreground border-border",
  refusee: "bg-destructive/10 text-destructive border-destructive/30",
  annulee: "bg-muted text-muted-foreground border-border line-through",
};

const ACTIVE = new Set(["en_cours", "acceptee", "modifiee"]);

function toISODate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function PlanningPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantierId, setChantierId] = useState<string>("");
  const [aires, setAires] = useState<Aire[]>([]);
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [demandeMats, setDemandeMats] = useState<DemandeMat[]>([]);
  const [date, setDate] = useState<string>(toISODate(new Date()));

  useEffect(() => {
    supabase.from("chantiers").select("id,nom").order("nom").then(({ data }) => {
      const list = (data ?? []) as Chantier[];
      setChantiers(list);
      if (list.length && !chantierId) setChantierId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!chantierId) return;
    supabase.from("aires").select("id,nom,capacite,chantier_id")
      .eq("chantier_id", chantierId).order("nom")
      .then(({ data }) => setAires((data ?? []) as Aire[]));
    supabase.from("materiels").select("id,nom,quantite,chantier_id")
      .eq("chantier_id", chantierId).order("nom")
      .then(({ data }) => setMateriels((data ?? []) as Materiel[]));
  }, [chantierId]);

  useEffect(() => {
    if (!chantierId) return;
    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    supabase.from("demandes").select("*")
      .eq("chantier_id", chantierId)
      .gte("debut", new Date(dayStart.getTime() - 24 * 3600 * 1000).toISOString())
      .lt("debut", dayEnd.toISOString())
      .then(async ({ data }) => {
        const items = ((data ?? []) as Demande[]).filter((d) => {
          const s = new Date(d.debut).getTime();
          const e = s + d.duree_min * 60000;
          return overlap(s, e, dayStart.getTime(), dayEnd.getTime());
        });
        setDemandes(items);
        const ids = items.map((d) => d.id);
        if (ids.length === 0) { setDemandeMats([]); return; }
        const { data: dm } = await supabase
          .from("demande_materiels")
          .select("demande_id,materiel_id,quantite")
          .in("demande_id", ids);
        setDemandeMats((dm ?? []) as DemandeMat[]);
      });
  }, [chantierId, date]);

  const shiftDay = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toISODate(d));
  };

  const matsByDemande = useMemo(() => {
    const m = new Map<string, DemandeMat[]>();
    for (const x of demandeMats) {
      if (!m.has(x.demande_id)) m.set(x.demande_id, []);
      m.get(x.demande_id)!.push(x);
    }
    return m;
  }, [demandeMats]);

  // Conflits aires
  const aireConflicts = useMemo(() => {
    const map = new Map<string, string>();
    const active = demandes.filter((d) => ACTIVE.has(d.statut) && d.aire_id);
    for (const d of active) {
      const aire = aires.find((a) => a.id === d.aire_id);
      if (!aire) continue;
      const ds = new Date(d.debut).getTime();
      const de = ds + d.duree_min * 60000;
      const overlapping = active.filter((o) => {
        if (o.id === d.id || o.aire_id !== d.aire_id) return false;
        const os = new Date(o.debut).getTime();
        const oe = os + o.duree_min * 60000;
        return overlap(ds, de, os, oe);
      });
      if (overlapping.length + 1 > aire.capacite) {
        map.set(d.id, `Aire ${aire.nom} saturée (${overlapping.length + 1}/${aire.capacite})`);
      }
    }
    return map;
  }, [demandes, aires]);

  // Conflits matériel : pour chaque demande active et chaque matériel utilisé,
  // somme des quantités utilisées par les demandes actives qui chevauchent ce créneau.
  const matConflicts = useMemo(() => {
    const map = new Map<string, string[]>();
    const active = demandes.filter((d) => ACTIVE.has(d.statut));
    for (const d of active) {
      const myMats = matsByDemande.get(d.id) ?? [];
      if (myMats.length === 0) continue;
      const ds = new Date(d.debut).getTime();
      const de = ds + d.duree_min * 60000;
      const overlappers = active.filter((o) => {
        if (o.id === d.id) return false;
        const os = new Date(o.debut).getTime();
        const oe = os + o.duree_min * 60000;
        return overlap(ds, de, os, oe);
      });
      for (const mm of myMats) {
        const stock = materiels.find((x) => x.id === mm.materiel_id);
        if (!stock) continue;
        let total = mm.quantite;
        for (const o of overlappers) {
          const oMats = matsByDemande.get(o.id) ?? [];
          const m = oMats.find((x) => x.materiel_id === mm.materiel_id);
          if (m) total += m.quantite;
        }
        if (total > stock.quantite) {
          const prev = map.get(d.id) ?? [];
          prev.push(`${stock.nom} en rupture (${total}/${stock.quantite})`);
          map.set(d.id, prev);
        }
      }
    }
    return map;
  }, [demandes, materiels, matsByDemande]);

  const totalConflicts = aireConflicts.size + matConflicts.size;

  // Group by aire
  const groupedAires = useMemo(() => {
    const byAire = new Map<string, Demande[]>();
    for (const d of demandes) {
      const key = d.aire_id ?? "_none";
      if (!byAire.has(key)) byAire.set(key, []);
      byAire.get(key)!.push(d);
    }
    for (const arr of byAire.values()) {
      arr.sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
    }
    return byAire;
  }, [demandes]);

  // Group by materiel
  const groupedMats = useMemo(() => {
    const byMat = new Map<string, { demande: Demande; qty: number }[]>();
    for (const dm of demandeMats) {
      const dem = demandes.find((d) => d.id === dm.demande_id);
      if (!dem) continue;
      if (!byMat.has(dm.materiel_id)) byMat.set(dm.materiel_id, []);
      byMat.get(dm.materiel_id)!.push({ demande: dem, qty: dm.quantite });
    }
    for (const arr of byMat.values()) {
      arr.sort((a, b) => new Date(a.demande.debut).getTime() - new Date(b.demande.debut).getTime());
    }
    return byMat;
  }, [demandeMats, demandes]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Planning</h1>
        <p className="text-sm text-muted-foreground">
          Vue jour par aires et matériel — conflits de capacité signalés.
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
          <Label className="text-xs">Date</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            <Button variant="outline" size="icon" onClick={() => shiftDay(1)}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(toISODate(new Date()))}>
              Aujourd'hui
            </Button>
          </div>
        </div>
      </div>

      {totalConflicts > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 mt-0.5" />
          <span>
            {totalConflicts} conflit{totalConflicts > 1 ? "s" : ""} détecté{totalConflicts > 1 ? "s" : ""}
            {aireConflicts.size > 0 && ` · ${aireConflicts.size} aire${aireConflicts.size > 1 ? "s" : ""}`}
            {matConflicts.size > 0 && ` · ${matConflicts.size} matériel${matConflicts.size > 1 ? "s" : ""}`}
          </span>
        </div>
      )}

      {!chantierId ? (
        <p className="text-sm text-muted-foreground">Aucun chantier accessible.</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="size-4" /> Aires de livraison
            </h2>
            {aires.length === 0 && !groupedAires.has("_none") ? (
              <p className="text-sm text-muted-foreground">Aucune aire ni créneau.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {aires.map((aire) => {
                  const items = groupedAires.get(aire.id) ?? [];
                  return (
                    <Card key={aire.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">{aire.nom}</CardTitle>
                        <Badge variant="outline">Capacité {aire.capacite}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Aucun créneau.</p>
                        ) : items.map((d) => (
                          <Slot key={d.id} d={d}
                            aireConflict={aireConflicts.get(d.id)}
                            matConflicts={matConflicts.get(d.id)} />
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
                {groupedAires.get("_none") && (
                  <Card>
                    <CardHeader><CardTitle className="text-base text-muted-foreground">Sans aire assignée</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {groupedAires.get("_none")!.map((d) => (
                        <Slot key={d.id} d={d}
                          aireConflict={aireConflicts.get(d.id)}
                          matConflicts={matConflicts.get(d.id)} />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </section>

          {materiels.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wrench className="size-4" /> Matériel
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {materiels.map((m) => {
                  const items = groupedMats.get(m.id) ?? [];
                  return (
                    <Card key={m.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">{m.nom}</CardTitle>
                        <Badge variant="outline">Stock {m.quantite}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Aucune réservation.</p>
                        ) : items.map(({ demande, qty }) => (
                          <Slot key={demande.id} d={demande}
                            aireConflict={aireConflicts.get(demande.id)}
                            matConflicts={matConflicts.get(demande.id)}
                            extra={`× ${qty}`} />
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Slot({ d, aireConflict, matConflicts, extra }: {
  d: Demande; aireConflict?: string; matConflicts?: string[]; extra?: string;
}) {
  const start = new Date(d.debut);
  const end = new Date(start.getTime() + d.duree_min * 60000);
  const fmt = (x: Date) => x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${STATUT_COLOR[d.statut] ?? "border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{fmt(start)} – {fmt(end)}</span>
        <Badge variant="outline" className="text-xs capitalize">{d.statut.replace("_", " ")}</Badge>
      </div>
      <div className="text-xs opacity-80">
        {d.nature}{extra && <span className="ml-1 font-medium">{extra}</span>}
      </div>
      {aireConflict && (
        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="size-3" /> {aireConflict}
        </div>
      )}
      {matConflicts?.map((c, i) => (
        <div key={i} className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="size-3" /> {c}
        </div>
      ))}
    </div>
  );
}
