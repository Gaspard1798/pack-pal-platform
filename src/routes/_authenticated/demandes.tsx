import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Check, X, CheckCircle2, Pencil } from "lucide-react";

type Statut = "en_cours" | "acceptee" | "refusee" | "modifiee" | "terminee" | "annulee";

type Chantier = { id: string; nom: string };
type Aire = { id: string; nom: string; chantier_id: string; capacite?: number };
type OccSlot = { id: string; aire_id: string | null; debut: string; duree_min: number; nature: string; statut: string };
type Materiel = { id: string; nom: string; type: string | null; quantite: number; chantier_id: string };
type Demande = {
  id: string;
  chantier_id: string;
  prestataire_id: string;
  aire_id: string | null;
  debut: string;
  duree_min: number;
  nature: string;
  quantite: number | null;
  unite: string | null;
  statut: Statut;
  commentaire: string | null;
  raison_refus: string | null;
};

const STATUT_LABEL: Record<Statut, string> = {
  en_cours: "En cours",
  acceptee: "Acceptée",
  refusee: "Refusée",
  modifiee: "Modifiée",
  terminee: "Terminée",
  annulee: "Annulée",
};

const STATUT_VARIANT: Record<Statut, "default" | "secondary" | "destructive" | "outline"> = {
  en_cours: "secondary",
  acceptee: "default",
  refusee: "destructive",
  modifiee: "outline",
  terminee: "default",
  annulee: "outline",
};

export const Route = createFileRoute("/_authenticated/demandes")({
  component: DemandesPage,
});

function DemandesPage() {
  const { user, roles } = useAuth();
  const isPrestataire = roles.includes("prestataire");
  const isConducteur = roles.includes("conducteur") || roles.includes("admin");

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<Statut | "all">("all");
  const [filterChantier, setFilterChantier] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [c, d] = await Promise.all([
      supabase.from("chantiers").select("id, nom").order("nom"),
      supabase.from("demandes").select("*").order("debut", { ascending: false }),
    ]);
    if (c.error) toast.error(c.error.message);
    if (d.error) toast.error(d.error.message);
    setChantiers((c.data ?? []) as Chantier[]);
    setDemandes((d.data ?? []) as Demande[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const chantiersById = useMemo(
    () => Object.fromEntries(chantiers.map((c) => [c.id, c.nom])),
    [chantiers],
  );

  const filtered = demandes.filter((d) =>
    (filterStatut === "all" || d.statut === filterStatut) &&
    (filterChantier === "all" || d.chantier_id === filterChantier),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Demandes de créneaux</h1>
          <p className="text-sm text-muted-foreground">
            {isPrestataire ? "Vos demandes de livraison." : "Demandes à valider et à suivre."}
          </p>
        </div>
        {isPrestataire && chantiers.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Nouvelle demande</Button>
            </DialogTrigger>
            <NewDemandeDialog
              userId={user!.id}
              chantiers={chantiers}
              onCreated={() => { setOpen(false); load(); }}
            />
          </Dialog>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v as Statut | "all")}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {(Object.keys(STATUT_LABEL) as Statut[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUT_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={filterChantier} onValueChange={setFilterChantier}>
            <SelectTrigger><SelectValue placeholder="Chantier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les chantiers</SelectItem>
              {chantiers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{filtered.length} demande(s)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aucune demande.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Chantier</TableHead>
                  <TableHead>Nature</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <DemandeRow
                    key={d.id}
                    demande={d}
                    chantierNom={chantiersById[d.chantier_id] ?? "—"}
                    isConducteur={isConducteur}
                    isOwner={d.prestataire_id === user?.id}
                    onChanged={load}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DemandeRow({
  demande, chantierNom, isConducteur, isOwner, onChanged,
}: {
  demande: Demande; chantierNom: string;
  isConducteur: boolean; isOwner: boolean; onChanged: () => void;
}) {
  const [modifOpen, setModifOpen] = useState(false);

  const updateStatut = async (statut: Statut, extra?: Partial<Demande>) => {
    const { error } = await supabase
      .from("demandes")
      .update({ statut, ...extra })
      .eq("id", demande.id);
    if (error) toast.error(error.message);
    else { toast.success(`Demande ${STATUT_LABEL[statut].toLowerCase()}`); onChanged(); }
  };

  const refuse = async () => {
    const raison = window.prompt("Raison du refus ?");
    if (!raison) return;
    await updateStatut("refusee", { raison_refus: raison });
  };

  return (
    <TableRow>
      <TableCell>
        <Badge variant={STATUT_VARIANT[demande.statut]}>{STATUT_LABEL[demande.statut]}</Badge>
      </TableCell>
      <TableCell className="font-medium">{chantierNom}</TableCell>
      <TableCell>
        <div>{demande.nature}</div>
        {demande.statut === "modifiee" && demande.commentaire && (
          <div className="mt-0.5 max-w-xs text-xs text-blue-600 dark:text-blue-400">
            Proposition : {demande.commentaire}
          </div>
        )}
        {demande.statut === "refusee" && demande.raison_refus && (
          <div className="mt-0.5 max-w-xs text-xs text-destructive">
            Motif : {demande.raison_refus}
          </div>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {demande.quantite ? `${demande.quantite} ${demande.unite ?? ""}` : "—"}
      </TableCell>
      <TableCell>{new Date(demande.debut).toLocaleString("fr-FR")}</TableCell>
      <TableCell>{demande.duree_min} min</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {isConducteur && (demande.statut === "en_cours" || demande.statut === "modifiee") && (
            <>
              <Button size="sm" variant="outline" onClick={() => updateStatut("acceptee")}>
                <Check className="size-4" /> Accepter
              </Button>
              <Dialog open={modifOpen} onOpenChange={setModifOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Pencil className="size-4" /> Proposer
                  </Button>
                </DialogTrigger>
                <ModifierDialog
                  demande={demande}
                  onDone={() => { setModifOpen(false); onChanged(); }}
                />
              </Dialog>
              <Button size="sm" variant="outline" onClick={refuse}>
                <X className="size-4" /> Refuser
              </Button>
            </>
          )}
          {isConducteur && demande.statut === "acceptee" && (
            <Button size="sm" variant="outline" onClick={() => updateStatut("terminee")}>
              <CheckCircle2 className="size-4" /> Clore
            </Button>
          )}
          {isOwner && demande.statut === "modifiee" && (
            <Button size="sm" variant="default" onClick={() => updateStatut("acceptee")}>
              <Check className="size-4" /> Accepter la proposition
            </Button>
          )}
          {isOwner && (demande.statut === "en_cours" || demande.statut === "acceptee" || demande.statut === "modifiee") && (
            <Button size="sm" variant="ghost" onClick={() => updateStatut("annulee")}>
              Annuler
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ModifierDialog({ demande, onDone }: { demande: Demande; onDone: () => void }) {
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  };

  const [aires, setAires] = useState<Aire[]>([]);
  const [aireId, setAireId] = useState<string>(demande.aire_id ?? "none");
  const [debut, setDebut] = useState<string>(toLocalInput(demande.debut));
  const [duree, setDuree] = useState<number>(demande.duree_min);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("aires").select("id, nom, chantier_id").eq("chantier_id", demande.chantier_id)
      .order("nom").then(({ data }) => setAires((data ?? []) as Aire[]));
  }, [demande.chantier_id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debut) return;
    setSaving(true);
    const { error } = await supabase.from("demandes").update({
      statut: "modifiee",
      aire_id: aireId === "none" ? null : aireId,
      debut: new Date(debut).toISOString(),
      duree_min: duree,
      commentaire: commentaire || demande.commentaire,
    }).eq("id", demande.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contre-proposition envoyée");
    onDone();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Proposer une modification</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Aire de livraison</Label>
          <Select value={aireId} onValueChange={setAireId}>
            <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {aires.map((a) => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="mdebut">Nouveau début</Label>
            <Input id="mdebut" type="datetime-local" value={debut}
              onChange={(e) => setDebut(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mdur">Durée (min)</Label>
            <Input id="mdur" type="number" min={5} value={duree}
              onChange={(e) => setDuree(parseInt(e.target.value) || 0)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mcom">Message au prestataire</Label>
          <Textarea id="mcom" value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex : créneau déplacé pour éviter un conflit d'aire." maxLength={500} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !debut}>
            {saving ? "Envoi…" : "Envoyer la proposition"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}


function NewDemandeDialog({
  userId, chantiers, onCreated,
}: { userId: string; chantiers: Chantier[]; onCreated: () => void }) {
  const [chantierId, setChantierId] = useState<string>("");
  const [aires, setAires] = useState<Aire[]>([]);
  const [aireId, setAireId] = useState<string>("");
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [selectedMats, setSelectedMats] = useState<Record<string, number>>({});
  const [nature, setNature] = useState("");
  const [quantite, setQuantite] = useState<string>("");
  const [unite, setUnite] = useState("");
  const [debut, setDebut] = useState("");
  const [duree, setDuree] = useState(60);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [occupied, setOccupied] = useState<OccSlot[]>([]);

  useEffect(() => {
    if (!chantierId) {
      setAires([]); setAireId(""); setMateriels([]); setSelectedMats({});
      return;
    }
    supabase.from("aires").select("id, nom, chantier_id, capacite").eq("chantier_id", chantierId)
      .order("nom").then(({ data }) => setAires((data ?? []) as Aire[]));
    supabase.from("materiels").select("id, nom, type, quantite, chantier_id").eq("chantier_id", chantierId)
      .order("nom").then(({ data }) => {
        setMateriels((data ?? []) as Materiel[]);
        setSelectedMats({});
      });
  }, [chantierId]);

  // Charge les créneaux déjà réservés (actifs) du chantier pour le jour choisi.
  useEffect(() => {
    if (!chantierId || !debut) { setOccupied([]); return; }
    const day = new Date(debut);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    supabase.from("demandes")
      .select("id, aire_id, debut, duree_min, nature, statut")
      .eq("chantier_id", chantierId)
      .in("statut", ["en_cours", "acceptee", "modifiee"])
      .gte("debut", new Date(dayStart.getTime() - 24 * 3600 * 1000).toISOString())
      .lt("debut", dayEnd.toISOString())
      .order("debut")
      .then(({ data }) => {
        const items = ((data ?? []) as OccSlot[]).filter((d) => {
          const s = new Date(d.debut).getTime();
          return s >= dayStart.getTime() - 12 * 3600 * 1000 && s < dayEnd.getTime();
        });
        setOccupied(items);
      });
  }, [chantierId, debut]);

  const toggleMat = (id: string, checked: boolean) => {
    setSelectedMats((prev) => {
      const next = { ...prev };
      if (checked) next[id] = next[id] ?? 1;
      else delete next[id];
      return next;
    });
  };

  const setMatQty = (id: string, q: number) => {
    setSelectedMats((prev) => ({ ...prev, [id]: q }));
  };

  // Créneaux occupés sur l'aire sélectionnée + détection de conflit pour le créneau saisi.
  const sameAireOccupied = useMemo(
    () => occupied.filter((o) => aireId && o.aire_id === aireId),
    [occupied, aireId],
  );

  const conflict = useMemo(() => {
    if (!aireId || !debut || !duree) return null;
    const s = new Date(debut).getTime();
    const e = s + duree * 60000;
    const overlapping = sameAireOccupied.filter((o) => {
      const os = new Date(o.debut).getTime();
      const oe = os + o.duree_min * 60000;
      return s < oe && os < e;
    });
    if (overlapping.length === 0) return null;
    const cap = aires.find((a) => a.id === aireId)?.capacite ?? 1;
    if (overlapping.length + 1 > cap) {
      return { overlapping, cap };
    }
    return null;
  }, [aireId, debut, duree, sameAireOccupied, aires]);

  // Propose le prochain créneau libre après le dernier conflit.
  const suggestion = useMemo(() => {
    if (!conflict) return null;
    const latestEnd = Math.max(
      ...conflict.overlapping.map((o) => new Date(o.debut).getTime() + o.duree_min * 60000),
    );
    return new Date(latestEnd);
  }, [conflict]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chantierId || !nature || !debut) return;
    if (aires.length > 0 && !aireId) {
      toast.error("Veuillez sélectionner une aire de livraison.");
      return;
    }


    setSaving(true);
    const { data: created, error } = await supabase.from("demandes").insert({
      chantier_id: chantierId,
      prestataire_id: userId,
      aire_id: aireId || null,
      nature,
      quantite: quantite ? parseFloat(quantite) : null,
      unite: unite || null,
      debut: new Date(debut).toISOString(),
      duree_min: duree,
      commentaire: commentaire || null,
    }).select("id").single();

    if (error || !created) {
      setSaving(false);
      toast.error(error?.message ?? "Erreur");
      return;
    }

    const matRows = Object.entries(selectedMats)
      .filter(([, q]) => q > 0)
      .map(([materiel_id, q]) => ({ demande_id: created.id, materiel_id, quantite: q }));
    if (matRows.length > 0) {
      const { error: mErr } = await supabase.from("demande_materiels").insert(matRows);
      if (mErr) toast.error(`Matériel : ${mErr.message}`);
    }

    setSaving(false);
    toast.success("Demande envoyée");
    onCreated();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Nouvelle demande de créneau</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Chantier *</Label>
          <Select value={chantierId} onValueChange={setChantierId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {chantiers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {aires.length > 0 && (
          <div className="space-y-2">
            <Label>Aire de livraison *</Label>
            <Select value={aireId} onValueChange={setAireId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une aire…" /></SelectTrigger>
              <SelectContent>
                {aires.map((a) => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="nature">Nature de la livraison *</Label>
          <Input id="nature" value={nature} onChange={(e) => setNature(e.target.value)}
            placeholder="Béton, acier, terrassement…" required maxLength={120} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="q">Quantité</Label>
            <Input id="q" type="number" step="0.01" value={quantite}
              onChange={(e) => setQuantite(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u">Unité</Label>
            <Input id="u" value={unite} onChange={(e) => setUnite(e.target.value)}
              placeholder="m³, t, u…" maxLength={20} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="debut">Début *</Label>
            <Input id="debut" type="datetime-local" value={debut}
              onChange={(e) => setDebut(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dur">Durée (min) *</Label>
            <Input id="dur" type="number" min={5} value={duree}
              onChange={(e) => setDuree(parseInt(e.target.value) || 0)} required />
          </div>
        </div>

        {aireId && debut && (
          <div className="space-y-2">
            <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Créneaux déjà réservés sur cette aire ce jour-là
              </Label>
              <Badge variant="outline" className="text-xs">
                Capacité {aires.find((a) => a.id === aireId)?.capacite ?? 1}
              </Badge>
            </div>
            {sameAireOccupied.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun créneau réservé — l'aire est libre.</p>
            ) : (
              <div className="space-y-1">
                {sameAireOccupied.map((o) => {
                  const s = new Date(o.debut);
                  const e = new Date(s.getTime() + o.duree_min * 60000);
                  const fmt = (x: Date) => x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  const isClash = conflict?.overlapping.some((c) => c.id === o.id);
                  return (
                    <div key={o.id}
                      className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                        isClash
                          ? "bg-destructive/10 text-destructive line-through"
                          : "bg-muted text-muted-foreground"
                      }`}>
                      <span>{fmt(s)} – {fmt(e)}</span>
                      <span className="truncate pl-2">{o.nature}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {conflict && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                <X className="size-3.5 mt-0.5 shrink-0" />
                <div>
                  Ce créneau dépasse la capacité de l'aire ({conflict.overlapping.length + 1}/{conflict.cap}).
                  {suggestion && (
                    <button type="button"
                      className="ml-1 underline underline-offset-2"
                      onClick={() => {
                        const off = suggestion.getTimezoneOffset() * 60000;
                        setDebut(new Date(suggestion.getTime() - off).toISOString().slice(0, 16));
                      }}>
                      Proposer {suggestion.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {materiels.length > 0 && (
          <div className="space-y-2">
            <Label>Matériel nécessaire au déchargement (optionnel)</Label>
            <div className="space-y-2 rounded-md border p-3">
              {materiels.map((m) => {
                const checked = m.id in selectedMats;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`mat-${m.id}`}
                      checked={checked}
                      onCheckedChange={(c) => toggleMat(m.id, !!c)}
                    />
                    <label htmlFor={`mat-${m.id}`} className="flex-1 text-sm cursor-pointer">
                      {m.nom}
                      <span className="ml-1 text-xs text-muted-foreground">
                        (dispo {m.quantite}{m.type ? ` · ${m.type}` : ""})
                      </span>
                    </label>
                    {checked && (
                      <Input
                        type="number"
                        min={1}
                        max={m.quantite}
                        value={selectedMats[m.id]}
                        onChange={(e) => setMatQty(m.id, parseInt(e.target.value) || 1)}
                        className="h-8 w-20"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="com">Commentaire</Label>
          <Textarea id="com" value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            maxLength={500} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !chantierId || !nature || !debut || (aires.length > 0 && !aireId)}>

            {saving ? "Envoi…" : "Envoyer la demande"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
