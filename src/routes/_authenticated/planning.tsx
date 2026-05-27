import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/planning")({
  component: PlanningPage,
});

type Chantier = { id: string; nom: string };
type Aire = { id: string; nom: string; capacite: number; chantier_id: string };
type Demande = {
  id: string; chantier_id: string; aire_id: string | null; debut: string;
  duree_min: number; nature: string; statut: string; prestataire_id: string;
};

const STATUT_COLOR: Record<string, string> = {
  en_cours: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  acceptee: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  modifiee: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  terminee: "bg-muted text-muted-foreground border-border",
  refusee: "bg-destructive/10 text-destructive border-destructive/30",
  annulee: "bg-muted text-muted-foreground border-border line-through",
};

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
  const [demandes, setDemandes] = useState<Demande[]>([]);
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
  }, [chantierId]);

  useEffect(() => {
    if (!chantierId) return;
    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    supabase.from("demandes").select("*")
      .eq("chantier_id", chantierId)
      .gte("debut", new Date(dayStart.getTime() - 24 * 3600 * 1000).toISOString())
      .lt("debut", dayEnd.toISOString())
      .then(({ data }) => {
        // keep only those overlapping the day window
        const items = ((data ?? []) as Demande[]).filter((d) => {
          const s = new Date(d.debut).getTime();
          const e = s + d.duree_min * 60000;
          return overlap(s, e, dayStart.getTime(), dayEnd.getTime());
        });
        setDemandes(items);
      });
  }, [chantierId, date]);

  const shiftDay = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toISODate(d));
  };

  // Conflict detection: for each accepted/en_cours demande, count how many
  // OTHER active demandes on the same aire overlap. If count+1 > capacite, conflict.
  const activeStatuts = new Set(["en_cours", "acceptee", "modifiee"]);
  const conflictsById = useMemo(() => {
    const map = new Map<string, string>();
    const active = demandes.filter((d) => activeStatuts.has(d.statut) && d.aire_id);
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
        map.set(d.id, `Capacité dépassée sur ${aire.nom} (${overlapping.length + 1}/${aire.capacite})`);
      }
    }
    return map;
  }, [demandes, aires]);

  // Group by aire (+ "Non assignée")
  const grouped = useMemo(() => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Planning</h1>
          <p className="text-sm text-muted-foreground">
            Vue jour des créneaux par aire — les conflits de capacité sont signalés.
          </p>
        </div>
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

      {conflictsById.size > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 mt-0.5" />
          <span>{conflictsById.size} conflit{conflictsById.size > 1 ? "s" : ""} détecté{conflictsById.size > 1 ? "s" : ""} sur les aires de livraison.</span>
        </div>
      )}

      {!chantierId ? (
        <p className="text-sm text-muted-foreground">Aucun chantier accessible.</p>
      ) : aires.length === 0 && grouped.size === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune aire ni créneau pour cette date.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {aires.map((aire) => {
            const items = grouped.get(aire.id) ?? [];
            return (
              <Card key={aire.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{aire.nom}</CardTitle>
                  <Badge variant="outline">Capacité {aire.capacite}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun créneau.</p>
                  ) : items.map((d) => <Slot key={d.id} d={d} conflict={conflictsById.get(d.id)} />)}
                </CardContent>
              </Card>
            );
          })}
          {grouped.get("_none") && (
            <Card>
              <CardHeader><CardTitle className="text-base text-muted-foreground">Sans aire assignée</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {grouped.get("_none")!.map((d) => <Slot key={d.id} d={d} />)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Slot({ d, conflict }: { d: Demande; conflict?: string }) {
  const start = new Date(d.debut);
  const end = new Date(start.getTime() + d.duree_min * 60000);
  const fmt = (x: Date) => x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${STATUT_COLOR[d.statut] ?? "border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{fmt(start)} – {fmt(end)}</span>
        <Badge variant="outline" className="text-xs capitalize">{d.statut.replace("_", " ")}</Badge>
      </div>
      <div className="text-xs opacity-80">{d.nature}</div>
      {conflict && (
        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="size-3" /> {conflict}
        </div>
      )}
    </div>
  );
}
