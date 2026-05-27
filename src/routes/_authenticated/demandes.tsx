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
import { Plus, Check, X, CheckCircle2 } from "lucide-react";

type Statut = "en_cours" | "acceptee" | "refusee" | "modifiee" | "terminee" | "annulee";

type Chantier = { id: string; nom: string };
type Aire = { id: string; nom: string; chantier_id: string };
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
      <TableCell>{demande.nature}</TableCell>
      <TableCell className="text-muted-foreground">
        {demande.quantite ? `${demande.quantite} ${demande.unite ?? ""}` : "—"}
      </TableCell>
      <TableCell>{new Date(demande.debut).toLocaleString("fr-FR")}</TableCell>
      <TableCell>{demande.duree_min} min</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {isConducteur && demande.statut === "en_cours" && (
            <>
              <Button size="sm" variant="outline" onClick={() => updateStatut("acceptee")}>
                <Check className="size-4" /> Accepter
              </Button>
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
          {isOwner && (demande.statut === "en_cours" || demande.statut === "acceptee") && (
            <Button size="sm" variant="ghost" onClick={() => updateStatut("annulee")}>
              Annuler
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function NewDemandeDialog({
  userId, chantiers, onCreated,
}: { userId: string; chantiers: Chantier[]; onCreated: () => void }) {
  const [chantierId, setChantierId] = useState<string>("");
  const [aires, setAires] = useState<Aire[]>([]);
  const [aireId, setAireId] = useState<string>("");
  const [nature, setNature] = useState("");
  const [quantite, setQuantite] = useState<string>("");
  const [unite, setUnite] = useState("");
  const [debut, setDebut] = useState("");
  const [duree, setDuree] = useState(60);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!chantierId) { setAires([]); setAireId(""); return; }
    supabase.from("aires").select("id, nom, chantier_id").eq("chantier_id", chantierId)
      .order("nom").then(({ data }) => setAires((data ?? []) as Aire[]));
  }, [chantierId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chantierId || !nature || !debut) return;
    setSaving(true);
    const { error } = await supabase.from("demandes").insert({
      chantier_id: chantierId,
      prestataire_id: userId,
      aire_id: aireId || null,
      nature,
      quantite: quantite ? parseFloat(quantite) : null,
      unite: unite || null,
      debut: new Date(debut).toISOString(),
      duree_min: duree,
      commentaire: commentaire || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Demande envoyée"); onCreated(); }
  };

  return (
    <DialogContent className="max-w-lg">
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
            <Label>Aire de livraison</Label>
            <Select value={aireId} onValueChange={setAireId}>
              <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
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

        <div className="space-y-2">
          <Label htmlFor="com">Commentaire</Label>
          <Textarea id="com" value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            maxLength={500} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={saving || !chantierId || !nature || !debut}>
            {saving ? "Envoi…" : "Envoyer la demande"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
