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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, FileDown, Recycle, CheckCircle2, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dechets")({
  component: DechetsPage,
});

type Chantier = { id: string; nom: string };
type Aire = { id: string; nom: string; capacite: number };
type Entreprise = { id: string; nom: string };
type Contenant = {
  id: string; chantier_id: string; type: "benne" | "bac" | "bigbag";
  volume_m3: number | null; type_dechet: "dib" | "gravats" | "tri" | "did";
  reference: string; emplacement: string | null; actif: boolean; notes: string | null;
};
type Rotation = {
  id: string; chantier_id: string; contenant_id: string | null;
  prestataire_id: string; type_operation: "pose" | "rotation" | "enlevement";
  type_dechet: "dib" | "gravats" | "tri" | "did";
  contenant_type: "benne" | "bac" | "bigbag"; volume_m3: number | null;
  debut: string; duree_min: number; aire_id: string | null;
  statut: "en_cours" | "acceptee" | "refusee" | "terminee" | "annulee";
  commentaire: string | null; raison_refus: string | null;
};
type Validation = {
  id: string; rotation_id: string; effectuee_le: string;
  poids_estime_kg: number | null; commentaire: string | null;
};

const DECHET_LABEL: Record<string, string> = {
  dib: "DIB / Tout-venant", gravats: "Gravats / Inertes", tri: "Bois / Métal / Plâtre", did: "Dangereux (DID)",
};
const CONTENANT_LABEL: Record<string, string> = {
  benne: "Benne", bac: "Bac roulant", bigbag: "Big bag",
};
const OP_LABEL: Record<string, string> = {
  pose: "Pose", rotation: "Rotation", enlevement: "Enlèvement",
};
const STATUT_LABEL: Record<string, string> = {
  en_cours: "En cours", acceptee: "Acceptée", refusee: "Refusée",
  terminee: "Terminée", annulee: "Annulée",
};
const STATUT_COLOR: Record<string, string> = {
  en_cours: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  acceptee: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  terminee: "bg-muted text-muted-foreground border-border",
  refusee: "bg-destructive/10 text-destructive border-destructive/30",
  annulee: "bg-muted text-muted-foreground border-border line-through",
};

function toISODateTimeLocal(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}
function toISOMonth(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 7);
}

function DechetsPage() {
  const { user, roles } = useAuth();
  const isConducteur = roles.includes("conducteur") || roles.includes("admin");
  const isOperateur = roles.includes("operateur") || isConducteur;
  const isPrestataire = roles.includes("prestataire") || isConducteur;

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantierId, setChantierId] = useState<string>("");
  const [aires, setAires] = useState<Aire[]>([]);
  const [entreprises, setEntreprises] = useState<Map<string, string>>(new Map());
  const [contenants, setContenants] = useState<Contenant[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, { full_name: string | null; email: string; entreprise_id: string | null }>>(new Map());

  useEffect(() => {
    supabase.from("chantiers").select("id,nom").order("nom").then(({ data }) => {
      const list = (data ?? []) as Chantier[];
      setChantiers(list);
      if (list.length && !chantierId) setChantierId(list[0].id);
    });
    supabase.from("entreprises").select("id,nom").then(({ data }) => {
      const m = new Map<string, string>();
      for (const e of (data ?? []) as Entreprise[]) m.set(e.id, e.nom);
      setEntreprises(m);
    });
  }, []);

  const loadAll = async () => {
    if (!chantierId) return;
    const [{ data: a }, { data: c }, { data: r }] = await Promise.all([
      supabase.from("aires").select("id,nom,capacite").eq("chantier_id", chantierId).order("nom"),
      supabase.from("contenants").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: false }),
      supabase.from("rotations").select("*").eq("chantier_id", chantierId).order("debut", { ascending: false }),
    ]);
    setAires((a ?? []) as Aire[]);
    setContenants((c ?? []) as Contenant[]);
    setRotations((r ?? []) as Rotation[]);
    const rids = (r ?? []).map((x: any) => x.id);
    if (rids.length) {
      const { data: v } = await supabase.from("rotation_validations").select("*").in("rotation_id", rids);
      setValidations((v ?? []) as Validation[]);
    } else setValidations([]);
    const uids = Array.from(new Set((r ?? []).map((x: any) => x.prestataire_id)));
    if (uids.length) {
      const { data: p } = await supabase.from("profiles").select("id,full_name,email,entreprise_id").in("id", uids);
      const map = new Map<string, any>();
      for (const pr of (p ?? []) as any[]) map.set(pr.id, pr);
      setProfileMap(map);
    }
  };
  useEffect(() => { loadAll(); }, [chantierId]);

  const validationsByRotation = useMemo(() => {
    const m = new Map<string, Validation>();
    for (const v of validations) m.set(v.rotation_id, v);
    return m;
  }, [validations]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
          <Recycle className="size-6" /> Déchets & Nettoyage
        </h1>
        <p className="text-sm text-muted-foreground">
          Gérez les contenants, planifiez les rotations et suivez les validations pour la facturation.
        </p>
      </div>

      <div className="space-y-1 max-w-md">
        <Label className="text-xs">Chantier</Label>
        <select value={chantierId} onChange={(e) => setChantierId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
          {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {!chantierId ? (
        <p className="text-sm text-muted-foreground">Aucun chantier accessible.</p>
      ) : (
        <Tabs defaultValue="rotations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rotations">Rotations</TabsTrigger>
            <TabsTrigger value="contenants">Contenants</TabsTrigger>
            <TabsTrigger value="facturation">Facturation mensuelle</TabsTrigger>
          </TabsList>

          <TabsContent value="rotations">
            <RotationsTab
              chantierId={chantierId} rotations={rotations} contenants={contenants} aires={aires}
              userId={user?.id ?? ""} isConducteur={isConducteur} isOperateur={isOperateur} isPrestataire={isPrestataire}
              profileMap={profileMap} entreprises={entreprises}
              validationsByRotation={validationsByRotation} onChange={loadAll}
            />
          </TabsContent>

          <TabsContent value="contenants">
            <ContenantsTab
              chantierId={chantierId} contenants={contenants}
              canEdit={isConducteur} onChange={loadAll}
            />
          </TabsContent>

          <TabsContent value="facturation">
            <FacturationTab
              rotations={rotations} validations={validations}
              profileMap={profileMap} entreprises={entreprises}
              chantierNom={chantiers.find((c) => c.id === chantierId)?.nom ?? ""}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* -------------------- Contenants -------------------- */
function ContenantsTab({ chantierId, contenants, canEdit, onChange }: {
  chantierId: string; contenants: Contenant[]; canEdit: boolean; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "benne" as Contenant["type"], type_dechet: "dib" as Contenant["type_dechet"],
    volume_m3: "", reference: "", emplacement: "", notes: "",
  });

  const create = async () => {
    if (!form.reference.trim()) return toast.error("Référence obligatoire");
    const { error } = await supabase.from("contenants").insert({
      chantier_id: chantierId, type: form.type, type_dechet: form.type_dechet,
      volume_m3: form.volume_m3 ? Number(form.volume_m3) : null,
      reference: form.reference.trim(),
      emplacement: form.emplacement.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Contenant ajouté");
    setOpen(false);
    setForm({ type: "benne", type_dechet: "dib", volume_m3: "", reference: "", emplacement: "", notes: "" });
    onChange();
  };

  const toggleActif = async (c: Contenant) => {
    const { error } = await supabase.from("contenants").update({ actif: !c.actif }).eq("id", c.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce contenant ?")) return;
    const { error } = await supabase.from("contenants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    onChange();
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Ajouter un contenant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau contenant</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      {Object.entries(CONTENANT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type de déchet</Label>
                    <select value={form.type_dechet} onChange={(e) => setForm({ ...form, type_dechet: e.target.value as any })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      {Object.entries(DECHET_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Référence *</Label>
                    <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Benne 15m³ n°1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Volume (m³)</Label>
                    <Input type="number" step="0.1" value={form.volume_m3} onChange={(e) => setForm({ ...form, volume_m3: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Emplacement</Label>
                  <Input value={form.emplacement} onChange={(e) => setForm({ ...form, emplacement: e.target.value })} placeholder="Zone Nord" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={create}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {contenants.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun contenant sur ce chantier.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {contenants.map((c) => (
            <Card key={c.id} className={c.actif ? "" : "opacity-60"}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{c.reference}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {CONTENANT_LABEL[c.type]}{c.volume_m3 ? ` · ${c.volume_m3} m³` : ""}
                  </p>
                </div>
                <Badge variant="outline">{DECHET_LABEL[c.type_dechet]}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.emplacement && <p className="text-muted-foreground">📍 {c.emplacement}</p>}
                {c.notes && <p className="text-muted-foreground">{c.notes}</p>}
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => toggleActif(c)}>
                      {c.actif ? "Désactiver" : "Réactiver"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Rotations -------------------- */
function RotationsTab({
  chantierId, rotations, contenants, aires, userId,
  isConducteur, isOperateur, isPrestataire,
  profileMap, entreprises, validationsByRotation, onChange,
}: {
  chantierId: string; rotations: Rotation[]; contenants: Contenant[]; aires: Aire[];
  userId: string; isConducteur: boolean; isOperateur: boolean; isPrestataire: boolean;
  profileMap: Map<string, any>; entreprises: Map<string, string>;
  validationsByRotation: Map<string, Validation>; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [valOpen, setValOpen] = useState<Rotation | null>(null);
  const [refuseOpen, setRefuseOpen] = useState<Rotation | null>(null);
  const [refuseMotif, setRefuseMotif] = useState("");
  const [form, setForm] = useState({
    contenant_id: "", contenant_type: "benne" as Rotation["contenant_type"],
    type_dechet: "dib" as Rotation["type_dechet"],
    type_operation: "rotation" as Rotation["type_operation"],
    volume_m3: "", debut: toISODateTimeLocal(), duree_min: 20,
    aire_id: "", commentaire: "",
  });

  const activeContenants = contenants.filter((c) => c.actif);

  const create = async () => {
    if (!form.debut) return toast.error("Date requise");
    const contenant = activeContenants.find((c) => c.id === form.contenant_id);
    const { error } = await supabase.from("rotations").insert({
      chantier_id: chantierId, prestataire_id: userId,
      contenant_id: form.contenant_id || null,
      contenant_type: contenant?.type ?? form.contenant_type,
      type_dechet: contenant?.type_dechet ?? form.type_dechet,
      type_operation: form.type_operation,
      volume_m3: contenant?.volume_m3 ?? (form.volume_m3 ? Number(form.volume_m3) : null),
      debut: new Date(form.debut).toISOString(),
      duree_min: Number(form.duree_min) || 20,
      aire_id: form.aire_id || null,
      commentaire: form.commentaire.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Rotation demandée");
    setOpen(false);
    onChange();
  };

  const setStatut = async (r: Rotation, statut: Rotation["statut"], raison?: string) => {
    const { error } = await supabase.from("rotations").update({
      statut, raison_refus: raison ?? null,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    onChange();
  };

  const canCreate = isPrestataire || isConducteur;

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Nouvelle rotation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Demande de rotation</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contenant (facultatif)</Label>
                  <select value={form.contenant_id} onChange={(e) => setForm({ ...form, contenant_id: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">— Contenant hors-inventaire —</option>
                    {activeContenants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.reference} ({CONTENANT_LABEL[c.type]} · {DECHET_LABEL[c.type_dechet]})
                      </option>
                    ))}
                  </select>
                </div>
                {!form.contenant_id && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type de contenant</Label>
                      <select value={form.contenant_type} onChange={(e) => setForm({ ...form, contenant_type: e.target.value as any })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                        {Object.entries(CONTENANT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type de déchet</Label>
                      <select value={form.type_dechet} onChange={(e) => setForm({ ...form, type_dechet: e.target.value as any })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                        {Object.entries(DECHET_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Opération</Label>
                    <select value={form.type_operation} onChange={(e) => setForm({ ...form, type_operation: e.target.value as any })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      {Object.entries(OP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Créneau</Label>
                    <Input type="datetime-local" value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Durée (min)</Label>
                    <Input type="number" min={5} step={5} value={form.duree_min}
                      onChange={(e) => setForm({ ...form, duree_min: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Aire (facultatif)</Label>
                  <select value={form.aire_id} onChange={(e) => setForm({ ...form, aire_id: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">— Aucune —</option>
                    {aires.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Commentaire</Label>
                  <Textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={create}>Envoyer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {rotations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune rotation demandée sur ce chantier.</p>
      ) : (
        <div className="space-y-2">
          {rotations.map((r) => {
            const prof = profileMap.get(r.prestataire_id);
            const entName = prof?.entreprise_id ? entreprises.get(prof.entreprise_id) : null;
            const val = validationsByRotation.get(r.id);
            const contenant = contenants.find((c) => c.id === r.contenant_id);
            const debut = new Date(r.debut);
            const fin = new Date(debut.getTime() + r.duree_min * 60000);
            const isMine = r.prestataire_id === userId;
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {OP_LABEL[r.type_operation]} · {CONTENANT_LABEL[r.contenant_type]}
                          {r.volume_m3 ? ` ${r.volume_m3}m³` : ""}
                        </span>
                        <Badge variant="outline">{DECHET_LABEL[r.type_dechet]}</Badge>
                        <Badge className={STATUT_COLOR[r.statut]}>{STATUT_LABEL[r.statut]}</Badge>
                        {val && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="size-3 mr-1" />Validée terrain</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {debut.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        {" – "}{fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {contenant && ` · ${contenant.reference}`}
                        {" · "}{prof?.full_name || prof?.email || "—"}{entName ? ` (${entName})` : ""}
                      </p>
                      {r.commentaire && <p className="text-sm mt-1">{r.commentaire}</p>}
                      {r.raison_refus && <p className="text-sm mt-1 text-destructive">Motif : {r.raison_refus}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {isConducteur && r.statut === "en_cours" && (
                        <>
                          <Button size="sm" onClick={() => setStatut(r, "acceptee")}>
                            <Check className="size-4" /> Accepter
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRefuseOpen(r); setRefuseMotif(""); }}>
                            <X className="size-4" /> Refuser
                          </Button>
                        </>
                      )}
                      {isOperateur && r.statut === "acceptee" && !val && (
                        <Button size="sm" variant="secondary" onClick={() => setValOpen(r)}>
                          <CheckCircle2 className="size-4" /> Valider changement
                        </Button>
                      )}
                      {isConducteur && r.statut === "acceptee" && val && (
                        <Button size="sm" variant="outline" onClick={() => setStatut(r, "terminee")}>
                          Clôturer
                        </Button>
                      )}
                      {isMine && r.statut === "en_cours" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatut(r, "annulee")}>
                          <Ban className="size-4" /> Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Refus dialog */}
      <Dialog open={!!refuseOpen} onOpenChange={(o) => !o && setRefuseOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser la rotation</DialogTitle></DialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">Motif</Label>
            <Textarea value={refuseMotif} onChange={(e) => setRefuseMotif(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseOpen(null)}>Annuler</Button>
            <Button variant="destructive" onClick={async () => {
              if (!refuseOpen) return;
              await setStatut(refuseOpen, "refusee", refuseMotif.trim() || undefined);
              setRefuseOpen(null);
            }}>Confirmer le refus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation dialog */}
      <ValidationDialog rotation={valOpen} onClose={() => setValOpen(null)} onSaved={onChange} userId={userId} />
    </div>
  );
}

function ValidationDialog({ rotation, onClose, onSaved, userId }: {
  rotation: Rotation | null; onClose: () => void; onSaved: () => void; userId: string;
}) {
  const [poids, setPoids] = useState("");
  const [commentaire, setCommentaire] = useState("");
  useEffect(() => { setPoids(""); setCommentaire(""); }, [rotation?.id]);

  const save = async () => {
    if (!rotation) return;
    const { error } = await supabase.from("rotation_validations").insert({
      rotation_id: rotation.id, validee_par: userId,
      poids_estime_kg: poids ? Number(poids) : null,
      commentaire: commentaire.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Changement validé");
    onClose();
    onSaved();
  };

  return (
    <Dialog open={!!rotation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Valider le changement de contenant</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Poids estimé (kg)</Label>
            <Input type="number" step="1" value={poids} onChange={(e) => setPoids(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Commentaire</Label>
            <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Valider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Facturation mensuelle -------------------- */
function FacturationTab({
  rotations, validations, profileMap, entreprises, chantierNom,
}: {
  rotations: Rotation[]; validations: Validation[];
  profileMap: Map<string, any>; entreprises: Map<string, string>;
  chantierNom: string;
}) {
  const [mois, setMois] = useState<string>(toISOMonth());

  const { rows, totals } = useMemo(() => {
    const [y, m] = mois.split("-").map(Number);
    const start = new Date(y, m - 1, 1).getTime();
    const end = new Date(y, m, 1).getTime();
    const valMap = new Map<string, Validation>();
    for (const v of validations) valMap.set(v.rotation_id, v);
    const inMonth = rotations.filter((r) => {
      const v = valMap.get(r.id);
      const t = v ? new Date(v.effectuee_le).getTime() : new Date(r.debut).getTime();
      return v && t >= start && t < end;
    });
    // Group by entreprise + type_dechet
    const grp = new Map<string, { entreprise: string; type_dechet: string; count: number; poids: number; volume: number }>();
    for (const r of inMonth) {
      const prof = profileMap.get(r.prestataire_id);
      const ent = prof?.entreprise_id ? (entreprises.get(prof.entreprise_id) ?? "—") : "Sans entreprise";
      const key = `${ent}||${r.type_dechet}`;
      const v = valMap.get(r.id);
      const cur = grp.get(key) ?? { entreprise: ent, type_dechet: r.type_dechet, count: 0, poids: 0, volume: 0 };
      cur.count += 1;
      cur.poids += v?.poids_estime_kg ?? 0;
      cur.volume += r.volume_m3 ?? 0;
      grp.set(key, cur);
    }
    const rows = [...grp.values()].sort((a, b) =>
      a.entreprise.localeCompare(b.entreprise) || a.type_dechet.localeCompare(b.type_dechet));
    const totals = rows.reduce((acc, r) => ({
      count: acc.count + r.count, poids: acc.poids + r.poids, volume: acc.volume + r.volume,
    }), { count: 0, poids: 0, volume: 0 });
    return { rows, totals };
  }, [rotations, validations, mois, profileMap, entreprises]);

  const exportCSV = () => {
    const header = ["Entreprise", "Type de déchet", "Nb rotations validées", "Poids estimé (kg)", "Volume total (m³)"];
    const lines = [header.join(";")];
    for (const r of rows) {
      lines.push([r.entreprise, DECHET_LABEL[r.type_dechet], r.count, r.poids, r.volume.toFixed(1)].join(";"));
    }
    lines.push(["TOTAL", "", totals.count, totals.poids, totals.volume.toFixed(1)].join(";"));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturation-dechets-${chantierNom.replace(/\s+/g, "-").toLowerCase()}-${mois}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Mois</Label>
          <Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} className="w-48" />
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
          <FileDown className="size-4" /> Exporter CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Seules les rotations <strong>validées par un opérateur terrain</strong> sont comptabilisées.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune rotation validée sur ce mois.</p>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Entreprise</th>
                  <th className="p-3 font-medium">Type de déchet</th>
                  <th className="p-3 font-medium text-right">Rotations</th>
                  <th className="p-3 font-medium text-right">Poids (kg)</th>
                  <th className="p-3 font-medium text-right">Volume (m³)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{r.entreprise}</td>
                    <td className="p-3">{DECHET_LABEL[r.type_dechet]}</td>
                    <td className="p-3 text-right font-medium">{r.count}</td>
                    <td className="p-3 text-right">{r.poids || "—"}</td>
                    <td className="p-3 text-right">{r.volume ? r.volume.toFixed(1) : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="p-3" colSpan={2}>TOTAL</td>
                  <td className="p-3 text-right">{totals.count}</td>
                  <td className="p-3 text-right">{totals.poids || "—"}</td>
                  <td className="p-3 text-right">{totals.volume ? totals.volume.toFixed(1) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
