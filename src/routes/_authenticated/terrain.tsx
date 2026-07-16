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
import { Clock, LogIn, LogOut, AlertTriangle, MapPin, ImagePlus, X, Loader2, CheckCircle2 } from "lucide-react";

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
  retard_minutes: number | null;
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

function TerrainPage() {
  const { user } = useAuth();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantierId, setChantierId] = useState<string>("");
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

    const [{ data: aireData }, { data: demandeData }] = await Promise.all([
      supabase.from("aires").select("id,nom").eq("chantier_id", chantierId).order("nom"),
      supabase.from("demandes").select("*")
        .eq("chantier_id", chantierId)
        .in("statut", ["en_cours", "acceptee", "modifiee"])
        .order("debut"),
    ]);

    setAires((aireData ?? []) as Aire[]);
    const allDemandes = (demandeData ?? []) as Demande[];

    let items: Demande[] = allDemandes;
    if (allDemandes.length) {
      const ids = allDemandes.map((d) => d.id);
      const { data: venues } = await supabase
        .from("venues").select("*").in("demande_id", ids);
      const map = new Map<string, Venue>();
      ((venues ?? []) as Venue[]).forEach((v) => map.set(v.demande_id, v));
      setVenuesByDemande(map);
      // On garde tout ce qui n'est pas encore traité (ni terminé, annulé, refusé)
      items = allDemandes.filter((d) => !["terminee", "annulee", "refusee"].includes(d.statut));
    } else {
      setVenuesByDemande(new Map());
    }
    setDemandes(items);
    setLoading(false);
  };
  useEffect(() => { loadData(); }, [chantierId]);

  const aireName = (id: string | null) => id ? (aires.find((a) => a.id === id)?.nom ?? "—") : "—";

  const onCheckin = async (d: Demande, isoDate?: string) => {
    const stamp = isoDate ?? new Date().toISOString();
    const existing = venuesByDemande.get(d.id);
    if (existing) {
      const { error } = await supabase.from("venues")
        .update({ arrivee_reelle: stamp, enregistre_par: user?.id })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("venues").insert({
        demande_id: d.id, arrivee_reelle: stamp, enregistre_par: user?.id,
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
    toast.success("Départ enregistré");
    loadData();
  };

  const onCloseDemande = async (d: Demande) => {
    if (!["en_cours", "acceptee", "modifiee"].includes(d.statut)) return;
    const { error } = await supabase.from("demandes").update({ statut: "terminee" }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Livraison clôturée");
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
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune livraison en attente de traitement.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((d) => (
            <DemandeCard
              key={d.id}
              d={d}
              venue={venuesByDemande.get(d.id)}
              aireName={aireName(d.aire_id)}
              onCheckin={(iso) => onCheckin(d, iso)}
              onCheckout={() => onCheckout(d)}
              onClose={() => onCloseDemande(d)}
              onChanged={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DemandeCard({
  d, venue, aireName, onCheckin, onCheckout, onClose, onChanged,
}: {
  d: Demande; venue?: Venue; aireName: string;
  onCheckin: (iso?: string) => void; onCheckout: () => void; onClose: () => void; onChanged: () => void;
}) {
  const { roles } = useAuth();
  const canClose = roles.includes("operateur") || roles.includes("admin");
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
                  <Badge key={nc} variant="destructive" className="text-[10px]">
                    {nc}{nc === "Retard" && venue.retard_minutes != null ? ` (${venue.retard_minutes} min)` : ""}
                  </Badge>
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
            <CheckinDialog defaultDate={start} onConfirm={onCheckin} />
          )}
          {arrived && !departed && (
            <Button size="sm" variant="secondary" onClick={onCheckout}>
              <LogOut className="size-4" /> Départ
            </Button>
          )}
          {arrived && canClose && !["terminee", "annulee", "refusee"].includes(d.statut) && (
            <Button size="sm" variant="default" onClick={onClose}>
              <CheckCircle2 className="size-4" /> Valider réception
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
  const [retardMin, setRetardMin] = useState<string>(
    venue?.retard_minutes != null ? String(venue.retard_minutes) : ""
  );
  const [existing, setExisting] = useState<string[]>(venue?.photos ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(venue?.non_conformites ?? []);
      setCommentaire(venue?.commentaire ?? "");
      setRetardMin(venue?.retard_minutes != null ? String(venue.retard_minutes) : "");
      setExisting(venue?.photos ?? []);
      setRemoved([]);
      setNewFiles([]);
    }
  }, [open, venue]);




  const toggle = (nc: string, checked: boolean) =>
    setSelected((prev) => checked ? [...prev, nc] : prev.filter((x) => x !== nc));

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const save = async () => {
    setSaving(true);

    // 1. remove deleted photos from storage
    if (removed.length > 0) {
      await supabase.storage.from("venue-photos").remove(removed);
    }

    // 2. upload new files
    const uploadedPaths: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${demandeId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file);
      if (upErr) { setSaving(false); return toast.error(`Photo : ${upErr.message}`); }
      uploadedPaths.push(path);
    }

    const photos = [...existing, ...uploadedPaths];
    const retard = selected.includes("Retard") && retardMin.trim() !== ""
      ? Math.max(0, parseInt(retardMin, 10) || 0)
      : null;

    if (venue) {
      const { error } = await supabase.from("venues")
        .update({ non_conformites: selected, commentaire: commentaire || null, photos, retard_minutes: retard, enregistre_par: user?.id })
        .eq("id", venue.id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from("venues").insert({
        demande_id: demandeId, non_conformites: selected,
        commentaire: commentaire || null, photos, retard_minutes: retard, enregistre_par: user?.id,
      });
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    setOpen(false);
    toast.success("Compte-rendu enregistré");
    onSaved();
  };

  const removeExisting = (path: string) => {
    setExisting((prev) => prev.filter((p) => p !== path));
    setRemoved((prev) => [...prev, path]);
  };

  const photoCount = (venue?.photos?.length ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <AlertTriangle className="size-4" />
          {venue?.non_conformites?.length ? `NC (${venue.non_conformites.length})` : "Non-conformité"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
          {selected.includes("Retard") && (
            <div className="space-y-2">
              <Label htmlFor="nc-retard">Durée du retard (minutes)</Label>
              <Input
                id="nc-retard"
                type="number"
                min={0}
                inputMode="numeric"
                value={retardMin}
                onChange={(e) => setRetardMin(e.target.value)}
                placeholder="Ex. 30"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="nc-com">Commentaire</Label>
            <Textarea id="nc-com" value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Détails, observations…" />
          </div>

          <div className="space-y-2">
            <Label>Photos {photoCount > 0 && `(${photoCount} enregistrée${photoCount > 1 ? "s" : ""})`}</Label>
            <div className="flex flex-wrap gap-2">
              {existing.map((path) => (
                <ThumbWithRemove key={path} path={path} onRemove={() => removeExisting(path)} />
              ))}
              {newFiles.map((file, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button type="button"
                    onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:bg-muted/50">
                <ImagePlus className="size-5" />
                <span className="text-[10px]">Ajouter</span>
                <input type="file" accept="image/*" multiple capture="environment"
                  className="hidden" onChange={onPick} />
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useSignedUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage.from("venue-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [path]);
  return url;
}

function ThumbWithRemove({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useSignedUrl(path);
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      <button type="button" onClick={onRemove}
        className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5">
        <X className="size-3" />
      </button>
    </div>
  );
}

function VenuePhotos({ paths }: { paths: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1.5">
      {paths.map((p) => <VenuePhotoThumb key={p} path={p} />)}
    </div>
  );
}

function VenuePhotoThumb({ path }: { path: string }) {
  const url = useSignedUrl(path);
  if (!url) return <div className="h-14 w-14 rounded border bg-muted" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block h-14 w-14 overflow-hidden rounded border">
      <img src={url} alt="Photo terrain" className="h-full w-full object-cover" loading="lazy" />
    </a>
  );
}

function toLocalInputValue(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function CheckinDialog({
  defaultDate, onConfirm,
}: { defaultDate: Date; onConfirm: (iso?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toLocalInputValue(new Date()));

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) setValue(toLocalInputValue(new Date()));
    }}>
      <DialogTrigger asChild>
        <Button size="sm"><LogIn className="size-4" /> Arrivée</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Enregistrer l'arrivée</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Créneau prévu : {defaultDate.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure d'arrivée</Label>
            <Input
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => setValue(toLocalInputValue(new Date()))}
            >
              Maintenant
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={() => {
              const iso = value ? new Date(value).toISOString() : new Date().toISOString();
              onConfirm(iso);
              setOpen(false);
            }}
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

