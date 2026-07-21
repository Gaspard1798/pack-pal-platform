import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Megaphone, AlertTriangle, CalendarClock, Sparkles } from "lucide-react";
import { PublicationCard, type PublicationCardData } from "@/components/publications/publication-card";

export const Route = createFileRoute("/_authenticated/informations/")({
  component: InformationsDashboard,
});

type Row = PublicationCardData & { chantier_id: string };

function InformationsDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("publications")
        .select(
          "id,titre,resume,priorite,epingle,date_debut,date_fin,zone_type,zone_libre,destinataires_type,chantier_id,category:publication_categories(nom,icone),pieces:publication_pieces_jointes(count),entreprises:publication_entreprises(entreprise:entreprises(nom))"
        )
        .order("epingle", { ascending: false })
        .order("date_debut", { ascending: false })
        .limit(200);
      const mapped: Row[] = (data ?? []).map((r: any) => ({
        id: r.id,
        titre: r.titre,
        resume: r.resume,
        priorite: r.priorite,
        epingle: r.epingle,
        date_debut: r.date_debut,
        date_fin: r.date_fin,
        zone_type: r.zone_type,
        zone_libre: r.zone_libre,
        destinataires_type: r.destinataires_type,
        chantier_id: r.chantier_id,
        category: r.category,
        pieces_count: r.pieces?.[0]?.count ?? 0,
        entreprises_noms: (r.entreprises ?? []).map((e: any) => e.entreprise?.nom).filter(Boolean),
      }));
      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  const now = Date.now();
  const weekEnd = now + 7 * 24 * 3600 * 1000;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const active = rows.filter((r) => !r.date_fin || new Date(r.date_fin).getTime() >= now);
  const kpis = {
    actives: active.length,
    urgent: active.filter((r) => r.priorite === "urgent").length,
    today: rows.filter((r) => new Date(r.date_debut).getTime() >= dayStart.getTime()).length,
    expiringWeek: active.filter(
      (r) => r.date_fin && new Date(r.date_fin).getTime() <= weekEnd
    ).length,
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return active;
    return active.filter(
      (r) =>
        r.titre.toLowerCase().includes(term) ||
        (r.resume ?? "").toLowerCase().includes(term) ||
        (r.category?.nom ?? "").toLowerCase().includes(term)
    );
  }, [active, q]);

  const epinglees = active.filter((r) => r.epingle);
  const dernieres = filtered.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Megaphone} label="Publications actives" value={kpis.actives} />
        <Kpi icon={AlertTriangle} label="Urgentes" value={kpis.urgent} tone="urgent" />
        <Kpi icon={Sparkles} label="Publiées aujourd'hui" value={kpis.today} />
        <Kpi icon={CalendarClock} label="Expirent cette semaine" value={kpis.expiringWeek} />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une publication…"
          className="pl-9"
        />
      </div>

      {epinglees.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Épinglées</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {epinglees.map((p) => (
              <PublicationCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Dernières publications
          </h2>
          <Link to="/informations/actives" className="text-xs text-primary hover:underline">
            Voir tout →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : dernieres.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune publication pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {dernieres.map((p) => (
              <PublicationCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "urgent";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className={`size-4 ${tone === "urgent" ? "text-destructive" : ""}`} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${tone === "urgent" && value > 0 ? "text-destructive" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
