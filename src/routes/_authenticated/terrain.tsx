import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, AlertTriangle, MapPin, ImagePlus, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/terrain")({
  component: TerrainPage,
});

type Chantier = { id: string; nom: string };
type Aire = { id: string; nom: string };
type Demande = {
  id: string; chantier_id: string; aire_id: string | null; debut: string;
  duree_min: number; nature: string; statut: string; prestataire_id: string;
  quantite: number | null; unite: string | null; commentaire: string | null;
};
type Venue = {
  id: string; demande_id: string;
  arrivee_reelle: string | null; depart_reel: string | null;
  non_conformites: string[] | null; commentaire: string | null;
  photos: string[] | null;
};

const NC_OPTIONS = [
  "Retard",
  "Quantité incorrecte",
  "Matériaux non conformes",
  "Documents manquants",
  "Accès bloqué",
  "Aire indisponible",
  "Autre",
];

function toISODate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function TerrainPage() {
  const { user } = useAuth();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantierId, setChantierId] = useState<string>("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [aires, setAires] = useState<Aire[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [venuesByDemande, setVenuesByDemande] = useState<Map<string, Venue>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("chantiers").select("id,nom").eq("actif", true).order("nom").then(({ data }) => {
      const list = (data ?? []) as Chantier[];
      setChantiers(list);
      if (list.length && !chantierId) setChantierId(list[0].id);
    });
  }, []);

  const loadData = async () => {
    if (!chantierId) return;
    setLoading(true);
    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

    const [{ data: aireData }, { data: demandeData }] = await Promise.all([
      supabase.from("aires").select("id,nom").eq("chantier_id", chantierId).order("nom"),
      supabase.from("demandes").select("*")
        .eq("chantier_id", chantierId)
        .gte("debut", new Date(dayStart.getTime() - 24 * 3600 * 1000).toISOString())
        .lt("debut", dayEnd.toISOString())
        .order("debut"),
    ]);

    setAires((aireData ?? []) as Aire[]);
    const items = ((demandeData ?? []) as Demande[]).filter((d) => {
      const s = new Date(d.debut).getTime();
      return s >= dayStart.getTime() - 12 * 3600 * 1000 && s < dayEnd.getTime();
    });
    setDemandes(items);

    if (items.length) {
      const ids = items.map((d) => d.id);
      const { data: venues } = await supabase
        .from("venues").select("*").in("demande_id", ids);
      const map = new Map<string, Venue>();
      ((venues ?? []) as Venue[]).forEach((v) => map.set(v.demande_id, v));
      setVenuesByDemande(map);
    } else setVenuesByDemande(new Map());
    setLoading(false);
  };
  useEffect(() => { loadData(); }, [chantierId, date]);

  const aireName = (id: string | null) => id ? (aires.find((a) => a.id === id)?.nom ?? "—") : "—";

  const onCheckin = async (d: Demande) => {
    const existing = venuesByDemande.get(d.id);
    if (existing) {
      const { error } = await supabase.from("venues")
        .update({ arrivee_reelle: new Date().toISOString(), enregistre_par: user?.id })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("venues").insert({
        demande_id: d.id, arrivee_reelle: new Date().toISOString(), enregistre_par: user?.id,
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Arrivée enregistrée");
    loadData();
  };

  const onCheckout = async (d: Demande) => {
    const existing = venuesByDemande.get(d.id);
    if (!existing) {
      const { error } = await supabase.from("venues").insert({
        demande_id: d.id, depart_reel: new Date().toISOString(), enregistre_par: user?.id,
      });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("venues")
        .update({ depart_reel: new Date().toISOString(), enregistre_par: user?.id })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    }
    // also mark demande terminee if accepted
    if (["en_cours", "acceptee", "modifiee"].includes(d.statut)) {
      await supabase.from("demandes").update({ statut: "terminee" }).eq("id", d.id);
    }
    toast.success("Départ enregistré");
    loadData();
  };

  const sorted = useMemo(
    () => [...demandes].sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime()),
    [demandes],
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Terrain</h1>
        <p className="text-sm text-muted-foreground">
          Pointage des arrivées/départs et déclaration de non-conformités.
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
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun créneau prévu pour cette date.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((d) => (
            <DemandeCard
              key={d.id}
              d={d}
              venue={venuesByDemande.get(d.id)}
              aireName={aireName(d.aire_id)}
              onCheckin={() => onCheckin(d)}
              onCheckout={() => onCheckout(d)}
              onChanged={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DemandeCard({
  d, venue, aireName, onCheckin, onCheckout, onChanged,
}: {
  d: Demande; venue?: Venue; aireName: string;
  onCheckin: () => void; onCheckout: () => void; onChanged: () => void;
}) {
  const start = new Date(d.debut);
  const end = new Date(start.getTime() + d.duree_min * 60000);
  const fmt = (x: Date) => x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const arrived = !!venue?.arrivee_reelle;
  const departed = !!venue?.depart_reel;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4" /> {fmt(start)} – {fmt(end)}
          </CardTitle>
          <Badge variant={departed ? "secondary" : arrived ? "default" : "outline"}>
            {departed ? "Terminée" : arrived ? "Sur site" : "À venir"}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" /> {aireName}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <div className="font-medium">{d.nature}</div>
          {d.quantite && (
            <div className="text-xs text-muted-foreground">
              {d.quantite} {d.unite ?? ""}
            </div>
          )}
        </div>

        {(arrived || departed) && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-0.5">
            {venue?.arrivee_reelle && (
              <div>Arrivée : {new Date(venue.arrivee_reelle).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
            )}
            {venue?.depart_reel && (
              <div>Départ : {new Date(venue.depart_reel).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
            )}
            {venue?.non_conformites && venue.non_conformites.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {venue.non_conformites.map((nc) => (
                  <Badge key={nc} variant="destructive" className="text-[10px]">{nc}</Badge>
                ))}
              </div>
            )}
            {venue?.commentaire && <div className="italic pt-1">"{venue.commentaire}"</div>}
            {venue?.photos && venue.photos.length > 0 && (
              <VenuePhotos paths={venue.photos} />
            )}
          </div>
        )}


        <div className="flex flex-wrap gap-2">
          {!arrived && (
            <Button size="sm" onClick={onCheckin}><LogIn className="size-4" /> Arrivée</Button>
          )}
          {arrived && !departed && (
            <Button size="sm" variant="secondary" onClick={onCheckout}>
              <LogOut className="size-4" /> Départ
            </Button>
          )}
          <NonConformiteDialog venue={venue} demandeId={d.id} onSaved={onChanged} />
        </div>
      </CardContent>
    </Card>
  );
}

function NonConformiteDialog({
  venue, demandeId, onSaved,
}: { venue?: Venue; demandeId: string; onSaved: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(venue?.non_conformites ?? []);
  const [commentaire, setCommentaire] = useState(venue?.commentaire ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(venue?.non_conformites ?? []);
      setCommentaire(venue?.commentaire ?? "");
    }
  }, [open, venue]);

  const toggle = (nc: string, checked: boolean) =>
    setSelected((prev) => checked ? [...prev, nc] : prev.filter((x) => x !== nc));

  const save = async () => {
    setSaving(true);
    if (venue) {
      const { error } = await supabase.from("venues")
        .update({ non_conformites: selected, commentaire: commentaire || null, enregistre_par: user?.id })
        .eq("id", venue.id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from("venues").insert({
        demande_id: demandeId, non_conformites: selected,
        commentaire: commentaire || null, enregistre_par: user?.id,
      });
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    setOpen(false);
    toast.success("Compte-rendu enregistré");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <AlertTriangle className="size-4" />
          {venue?.non_conformites?.length ? `NC (${venue.non_conformites.length})` : "Non-conformité"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compte-rendu / Non-conformités</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {NC_OPTIONS.map((nc) => (
              <label key={nc} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(nc)}
                  onCheckedChange={(c) => toggle(nc, !!c)} />
                {nc}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-com">Commentaire</Label>
            <Textarea id="nc-com" value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Détails, observations…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
