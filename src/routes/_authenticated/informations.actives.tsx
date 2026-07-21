import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PublicationCard, type PublicationCardData } from "@/components/publications/publication-card";
import type { Priorite } from "@/lib/publications";

export const Route = createFileRoute("/_authenticated/informations/actives")({
  component: ActivesPage,
});

type Row = PublicationCardData & { chantier_id: string };

function ActivesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<{ id: string; nom: string }[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [prio, setPrio] = useState<string>("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: pubs }, { data: c }] = await Promise.all([
        supabase
          .from("publications")
          .select(
            "id,titre,resume,priorite,epingle,date_debut,date_fin,zone_type,zone_libre,destinataires_type,chantier_id,category_id,category:publication_categories(nom,icone),pieces:publication_pieces_jointes(count),entreprises:publication_entreprises(entreprise:entreprises(nom))"
          )
          .order("epingle", { ascending: false })
          .order("date_debut", { ascending: false }),
        supabase.from("publication_categories").select("id,nom").order("ordre"),
      ]);
      const mapped: Row[] = (pubs ?? []).map((r: any) => ({
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
      setCats(c ?? []);
      setLoading(false);
    })();
  }, []);

  const active = rows.filter((r) => !r.date_fin || new Date(r.date_fin).getTime() >= Date.now());

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return active.filter((r) => {
      if (pinnedOnly && !r.epingle) return false;
      if (cat !== "all" && (r as any).category?.nom == null) return false;
      if (prio !== "all" && r.priorite !== (prio as Priorite)) return false;
      if (term) {
        const hay =
          `${r.titre} ${r.resume ?? ""} ${r.category?.nom ?? ""} ${(r.entreprises_noms ?? []).join(" ")} ${r.zone_libre ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [active, q, cat, prio, pinnedOnly]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={prio} onValueChange={setPrio}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Priorité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="information">Information</SelectItem>
            <SelectItem value="important">Important</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinnedOnly}
            onChange={(e) => setPinnedOnly(e.target.checked)}
            className="size-4"
          />
          Épinglées
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucune publication ne correspond à ces critères.
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
