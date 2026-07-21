import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PublicationCard, type PublicationCardData } from "@/components/publications/publication-card";

export const Route = createFileRoute("/_authenticated/informations/archives")({
  component: ArchivesPage,
});

type Row = PublicationCardData;

function ArchivesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("publications")
        .select(
          "id,titre,resume,priorite,epingle,date_debut,date_fin,zone_type,zone_libre,destinataires_type,category:publication_categories(nom,icone),pieces:publication_pieces_jointes(count),entreprises:publication_entreprises(entreprise:entreprises(nom))"
        )
        .not("date_fin", "is", null)
        .lt("date_fin", nowIso)
        .order("date_fin", { ascending: false });
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
        category: r.category,
        pieces_count: r.pieces?.[0]?.count ?? 0,
        entreprises_noms: (r.entreprises ?? []).map((e: any) => e.entreprise?.nom).filter(Boolean),
      }));
      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.titre} ${r.resume ?? ""} ${r.category?.nom ?? ""}`.toLowerCase().includes(term)
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher dans les archives…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucune publication archivée.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => <PublicationCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
