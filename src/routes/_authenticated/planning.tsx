import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Wrench, MapPin, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/planning")({
  component: PlanningPage,
});

type ViewMode = "jour" | "semaine" | "mois";
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

const STATUT_LABEL: Record<string, string> = {
  en_cours: "En attente",
  acceptee: "Acceptée",
  modifiee: "Modifiée",
  terminee: "Terminée",
  refusee: "Refusée",
  annulee: "Annulée",
};

const ACTIVE = new Set(["en_cours", "acceptee", "modifiee"]);

function toISODate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

// Renvoie [début, fin[ de la plage visible selon le mode.
function rangeFor(mode: ViewMode, isoDate: string): { start: Date; end: Date } {
  const base = new Date(isoDate + "T00:00:00");
  if (mode === "jour") {
    return { start: base, end: new Date(base.getTime() + 24 * 3600 * 1000) };
  }
  if (mode === "semaine") {
    const day = (base.getDay() + 6) % 7; // lundi = 0
    const start = new Date(base);
    start.setDate(base.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  // mois
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

function PlanningPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantierId, setChantierId] = useState<string>("");
  const [aires, setAires] = useState<Aire[]>([]);
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [demandeMats, setDemandeMats] = useState<DemandeMat[]>([]);
  const [date, setDate] = useState<string>(toISODate(new Date()));
  const [mode, setMode] = useState<ViewMode>("jour");
  const [aireFilter, setAireFilter] = useState<string>("all");
  const [statutFilter, setStatutFilter] = useState<string>("all");

  useEffect(() => { setAireFilter("all"); setStatutFilter("all"); }, [chantierId]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => rangeFor(mode, date), [mode, date]);

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
    supabase.from("demandes").select("*")
      .eq("chantier_id", chantierId)
      .gte("debut", new Date(rangeStart.getTime() - 24 * 3600 * 1000).toISOString())
      .lt("debut", rangeEnd.toISOString())
      .then(async ({ data }) => {
        const items = ((data ?? []) as Demande[]).filter((d) => {
          const s = new Date(d.debut).getTime();
          const e = s + d.duree_min * 60000;
          return overlap(s, e, rangeStart.getTime(), rangeEnd.getTime());
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
  }, [chantierId, rangeStart.getTime(), rangeEnd.getTime()]);

  const shift = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    if (mode === "jour") d.setDate(d.getDate() + delta);
    else if (mode === "semaine") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
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

  // Conflits matériel
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

  // Demandes du jour sélectionné (vue jour)
  const dayDemandes = useMemo(() => {
    if (mode !== "jour") return demandes;
    const ds = rangeStart.getTime();
    const de = rangeEnd.getTime();
    return demandes.filter((d) => {
      if (statutFilter !== "all" && d.statut !== statutFilter) return false;
      const s = new Date(d.debut).getTime();
      const e = s + d.duree_min * 60000;
      return overlap(s, e, ds, de);
    });
  }, [demandes, mode, rangeStart, rangeEnd, statutFilter]);

  // Group by aire (vue jour)
  const groupedAires = useMemo(() => {
    const byAire = new Map<string, Demande[]>();
    for (const d of dayDemandes) {
      const key = d.aire_id ?? "_none";
      if (!byAire.has(key)) byAire.set(key, []);
      byAire.get(key)!.push(d);
    }
    for (const arr of byAire.values()) {
      arr.sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
    }
    return byAire;
  }, [dayDemandes]);

  // Group by materiel (vue jour)
  const groupedMats = useMemo(() => {
    const byMat = new Map<string, { demande: Demande; qty: number }[]>();
    const dayIds = new Set(dayDemandes.map((d) => d.id));
    for (const dm of demandeMats) {
      if (!dayIds.has(dm.demande_id)) continue;
      const dem = dayDemandes.find((d) => d.id === dm.demande_id);
      if (!dem) continue;
      if (!byMat.has(dm.materiel_id)) byMat.set(dm.materiel_id, []);
      byMat.get(dm.materiel_id)!.push({ demande: dem, qty: dm.quantite });
    }
    for (const arr of byMat.values()) {
      arr.sort((a, b) => new Date(a.demande.debut).getTime() - new Date(b.demande.debut).getTime());
    }
    return byMat;
  }, [demandeMats, dayDemandes]);

  // Group by jour (vues semaine/mois)
  const groupedDays = useMemo(() => {
    const byDay = new Map<string, Demande[]>();
    const filtered = demandes.filter((d) => {
      if (statutFilter !== "all" && d.statut !== statutFilter) return false;
      if (aireFilter === "all") return true;
      if (aireFilter === "_none") return !d.aire_id;
      return d.aire_id === aireFilter;
    });
    for (const d of filtered) {
      const key = toISODate(new Date(d.debut));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(d);
    }
    for (const arr of byDay.values()) {
      arr.sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [demandes, aireFilter, statutFilter]);

  const aireName = (id: string | null) => id ? (aires.find((a) => a.id === id)?.nom ?? "—") : "Sans aire";

  const rangeLabel = useMemo(() => {
    if (mode === "jour") {
      return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
    }
    if (mode === "semaine") {
      const lastDay = new Date(rangeEnd.getTime() - 24 * 3600 * 1000);
      return `${rangeStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${lastDay.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return rangeStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [mode, date, rangeStart, rangeEnd]);

  const exportPDF = () => {
    const chantierNom = chantiers.find((c) => c.id === chantierId)?.nom ?? "Chantier";
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Fluxop — Planning", 14, 16);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${chantierNom} · ${rangeLabel}`, 14, 23);

    const sorted = [...demandes].sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
    const fmtTime = (x: Date) => x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const rows = sorted.map((d) => {
      const s = new Date(d.debut);
      const e = new Date(s.getTime() + d.duree_min * 60000);
      const conflits = [aireConflicts.get(d.id), ...(matConflicts.get(d.id) ?? [])]
        .filter(Boolean).join(" · ");
      return [
        s.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }),
        `${fmtTime(s)} – ${fmtTime(e)}`,
        aireName(d.aire_id),
        d.nature,
        (STATUT_COLOR[d.statut] ? STATUT_LABEL[d.statut] ?? d.statut : d.statut),
        conflits || "—",
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [["Jour", "Créneau", "Aire", "Nature", "Statut", "Conflit"]],
      body: rows.length ? rows : [["—", "—", "—", "Aucun créneau", "—", "—"]],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`planning-${chantierNom.replace(/\s+/g, "-").toLowerCase()}-${date}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Planning</h1>
          <p className="text-sm text-muted-foreground">
            Vue {mode} par aires et matériel — conflits de capacité signalés.
          </p>
        </div>
        <Button variant="outline" onClick={exportPDF} disabled={!chantierId}>
          <FileDown className="size-4" /> Exporter en PDF
        </Button>
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
          <Label className="text-xs">Vue</Label>
          <div className="flex rounded-md border border-input p-0.5">
            {(["jour", "semaine", "mois"] as ViewMode[]).map((m) => (
              <Button key={m} size="sm" variant={mode === m ? "default" : "ghost"}
                className="h-8 capitalize" onClick={() => setMode(m)}>
                {m}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Période</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            {mode === "jour" ? (
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            ) : (
              <span className="min-w-44 text-center text-sm font-medium capitalize">{rangeLabel}</span>
            )}
            <Button variant="outline" size="icon" onClick={() => shift(1)}>
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
      ) : mode === "jour" ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-1">Statut :</span>
            <Button size="sm" variant={statutFilter === "all" ? "default" : "outline"}
              className="h-7" onClick={() => setStatutFilter("all")}>
              Tous
            </Button>
            {(["en_cours", "acceptee", "modifiee", "terminee", "refusee", "annulee"] as const).map((s) => {
              const count = demandes.filter((d) => d.statut === s).length;
              return (
                <Button key={s} size="sm" variant={statutFilter === s ? "default" : "outline"}
                  className={`h-7 capitalize ${statutFilter === s ? "" : STATUT_COLOR[s]}`}
                  onClick={() => setStatutFilter(s)}>
                  {STATUT_LABEL[s] ?? s} ({count})
                </Button>
              );
            })}
          </div>
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
      ) : (
        <section className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-1">Aire :</span>
            <Button size="sm" variant={aireFilter === "all" ? "default" : "outline"}
              className="h-7" onClick={() => setAireFilter("all")}>
              Toutes ({demandes.length})
            </Button>
            {aires.map((a) => {
              const count = demandes.filter((d) => d.aire_id === a.id).length;
              return (
                <Button key={a.id} size="sm" variant={aireFilter === a.id ? "default" : "outline"}
                  className="h-7" onClick={() => setAireFilter(a.id)}>
                  {a.nom} ({count})
                </Button>
              );
            })}
            {demandes.some((d) => !d.aire_id) && (
              <Button size="sm" variant={aireFilter === "_none" ? "default" : "outline"}
                className="h-7" onClick={() => setAireFilter("_none")}>
                Sans aire ({demandes.filter((d) => !d.aire_id).length})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-1">Statut :</span>
            <Button size="sm" variant={statutFilter === "all" ? "default" : "outline"}
              className="h-7" onClick={() => setStatutFilter("all")}>
              Tous
            </Button>
            {(["en_cours", "acceptee", "modifiee", "terminee", "refusee", "annulee"] as const).map((s) => {
              const count = demandes.filter((d) => d.statut === s).length;
              return (
                <Button key={s} size="sm" variant={statutFilter === s ? "default" : "outline"}
                  className={`h-7 capitalize ${statutFilter === s ? "" : STATUT_COLOR[s]}`}
                  onClick={() => setStatutFilter(s)}>
                  {STATUT_LABEL[s] ?? s} ({count})
                </Button>
              );
            })}
          </div>
          {groupedDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun créneau sur cette période.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groupedDays.map(([dayKey, items]) => {
                const dayConflicts = items.filter((d) => aireConflicts.has(d.id) || matConflicts.has(d.id)).length;
                return (
                  <Card key={dayKey}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base capitalize">
                        {new Date(dayKey + "T12:00:00").toLocaleDateString("fr-FR", {
                          weekday: "short", day: "numeric", month: "short",
                        })}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {dayConflicts > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="size-3" /> {dayConflicts}
                          </Badge>
                        )}
                        <Badge variant="outline">{items.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {items.map((d) => (
                        <Slot key={d.id} d={d}
                          aireConflict={aireConflicts.get(d.id)}
                          matConflicts={matConflicts.get(d.id)}
                          extra={aireName(d.aire_id)} />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
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
        <Badge variant="outline" className="text-xs capitalize">{STATUT_LABEL[d.statut] ?? d.statut}</Badge>
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
