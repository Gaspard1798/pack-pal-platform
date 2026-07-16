import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  KeyRound, Building2, Building, Layers, Home, Wrench, UsersRound,
  QrCode, ScanLine, Plus, Trash2, ClipboardList, LogIn, LogOut,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/_authenticated/cles")({
  head: () => ({ meta: [{ title: "Clés & Accès — Fluxop" }] }),
  component: ClesPage,
});

type Chantier = { id: string; nom: string };
type Batiment = { id: string; chantier_id: string; nom: string; description: string | null };
type Bloc = { id: string; batiment_id: string; nom: string };
type Niveau = { id: string; bloc_id: string; nom: string; ordre: number | null };
type Logement = {
  id: string; niveau_id: string; numero: string; phase: string; statut: string;
  sensibilite: string; consignes: string | null;
};
type Lot = { id: string; chantier_id: string; nom: string; code: string | null };
type Entreprise = { id: string; nom: string };
type Compagnon = {
  id: string; entreprise_id: string | null; nom: string; prenom: string | null;
  telephone: string | null; email: string | null; actif: boolean;
};
type Trousseau = {
  id: string; chantier_id: string; reference: string; qr_code: string | null;
  logement_id: string | null; type: string | null; nb_cles: number; nb_doubles: number;
  emplacement: string | null; gestionnaire_id: string | null; statut: string;
  etat: string | null; commentaire: string | null;
};
type Mouvement = {
  id: string; trousseau_id: string; type: string;
  emetteur_id: string | null; destinataire_id: string | null; destinataire_libre: string | null;
  motif: string | null; logement_id: string | null; commentaire: string | null;
  created_at: string; created_by: string | null;
};

const PHASE_LABEL: Record<string, string> = {
  opr: "OPR", levee_reserves: "Levée de réserves", pre_livraison: "Pré-livraison",
  livraison: "Livraison", livre: "Livré",
};
const STATUT_LABEL: Record<string, string> = {
  ferme_disponible: "Fermé / disponible",
  demande_en_attente: "Demande en attente",
  ouverture_en_cours: "Ouverture en cours",
  intervention_en_cours: "Intervention en cours",
  sortie_a_controler: "Sortie à contrôler",
  remise_en_etat: "Remise en état",
  non_conforme: "Non conforme",
  bloque: "Bloqué",
  impossible_securiser: "Impossible à sécuriser",
  livre: "Livré",
  acces_interdit: "Accès interdit",
};
const STATUT_COLOR: Record<string, string> = {
  ferme_disponible: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  demande_en_attente: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  ouverture_en_cours: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  intervention_en_cours: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  sortie_a_controler: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  remise_en_etat: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  non_conforme: "bg-red-500/15 text-red-700 border-red-500/30",
  bloque: "bg-red-500/15 text-red-700 border-red-500/30",
  impossible_securiser: "bg-red-500/15 text-red-700 border-red-500/30",
  livre: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  acces_interdit: "bg-slate-500/15 text-slate-700 border-slate-500/30",
};
const TROUSSEAU_STATUT_LABEL: Record<string, string> = {
  disponible: "Disponible", affecte: "Affecté", en_utilisation: "En utilisation",
  prete: "Prêté", en_transfert: "En transfert", non_restitue: "Non restitué",
  manquant: "Manquant", perdu: "Perdu", casse: "Cassé",
  double_commande: "Double commandé", indisponible: "Indisponible", archive: "Archivé",
};
const MOUV_TYPE_LABEL: Record<string, string> = {
  affectation: "Affectation", ouverture: "Ouverture", transfert: "Transfert",
  restitution: "Restitution", declaration_perte: "Déclaration de perte",
  declaration_endommagement: "Endommagement", inventaire: "Inventaire",
};

function hasAny(userRoles: AppRole[], allowed: AppRole[]) {
  return userRoles.some((r) => allowed.includes(r));
}

function ClesPage() {
  const { roles, user } = useAuth();
  const canManage = hasAny(roles, ["admin", "conducteur", "gestionnaire_cles"]);

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantierId, setChantierId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("chantiers").select("id, nom").order("nom");
      if (error) toast.error(error.message);
      const list = (data ?? []) as Chantier[];
      setChantiers(list);
      if (list.length > 0) setChantierId(list[0].id);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <KeyRound className="size-6" /> Clés & Accès logements
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion OPR, ouvertures/fermetures, clés, non-conformités.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Chantier</Label>
          <Select value={chantierId} onValueChange={setChantierId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Chantier" /></SelectTrigger>
            <SelectContent>
              {chantiers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!chantierId ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Aucun chantier disponible. Créez d'abord un chantier.
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="demandes">Demandes</TabsTrigger>
            <TabsTrigger value="logements">Logements</TabsTrigger>
            <TabsTrigger value="cles">Clés</TabsTrigger>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
            <TabsTrigger value="nc">Non-conformités</TabsTrigger>
            <TabsTrigger value="rondes">Rondes</TabsTrigger>
            <TabsTrigger value="prise-poste">Prise de poste</TabsTrigger>
            <TabsTrigger value="parametres">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab chantierId={chantierId} /></TabsContent>
          <TabsContent value="demandes"><Placeholder title="Demandes d'accès" hint="Sera disponible dans le Lot 2 (workflow d'ouverture)." /></TabsContent>
          <TabsContent value="logements"><LogementsTab chantierId={chantierId} canManage={canManage} /></TabsContent>
          <TabsContent value="cles"><ClesTab chantierId={chantierId} canManage={canManage} userId={user?.id ?? null} /></TabsContent>
          <TabsContent value="interventions"><Placeholder title="Interventions en cours" hint="Sera disponible dans le Lot 2." /></TabsContent>
          <TabsContent value="nc"><Placeholder title="Non-conformités" hint="Sera disponible dans le Lot 3." /></TabsContent>
          <TabsContent value="rondes"><Placeholder title="Rondes" hint="Sera disponible dans le Lot 3." /></TabsContent>
          <TabsContent value="prise-poste"><PrisePosteTab chantierId={chantierId} userId={user?.id ?? null} roles={roles} /></TabsContent>
          <TabsContent value="parametres"><ParametresTab chantierId={chantierId} canManage={canManage} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

/* ---------- DASHBOARD ---------- */
function DashboardTab({ chantierId }: { chantierId: string }) {
  const [stats, setStats] = useState({
    logements: 0, ouverts: 0, interventions: 0, bloques: 0,
    trousseaux: 0, non_restitues: 0,
  });

  useEffect(() => {
    (async () => {
      const [logs, trs] = await Promise.all([
        supabase.from("logements").select("id, statut, niveau_id, niveaux!inner(bloc_id, blocs!inner(batiment_id, batiments!inner(chantier_id)))")
          .eq("niveaux.blocs.batiments.chantier_id", chantierId),
        supabase.from("trousseaux").select("id, statut").eq("chantier_id", chantierId),
      ]);
      const logements = (logs.data ?? []) as any[];
      const trousseaux = (trs.data ?? []) as any[];
      setStats({
        logements: logements.length,
        ouverts: logements.filter((l) => ["ouverture_en_cours", "intervention_en_cours"].includes(l.statut)).length,
        interventions: logements.filter((l) => l.statut === "intervention_en_cours").length,
        bloques: logements.filter((l) => ["bloque", "impossible_securiser", "non_conforme"].includes(l.statut)).length,
        trousseaux: trousseaux.length,
        non_restitues: trousseaux.filter((t) => t.statut === "non_restitue").length,
      });
    })();
  }, [chantierId]);

  const kpis = [
    { label: "Logements", value: stats.logements, icon: Home },
    { label: "Actuellement ouverts", value: stats.ouverts, icon: LogIn, color: "text-blue-600" },
    { label: "Interventions en cours", value: stats.interventions, icon: Wrench, color: "text-blue-600" },
    { label: "Bloqués / NC", value: stats.bloques, icon: ClipboardList, color: "text-red-600" },
    { label: "Trousseaux enregistrés", value: stats.trousseaux, icon: KeyRound },
    { label: "Clés non restituées", value: stats.non_restitues, icon: KeyRound, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {kpis.map((k) => (
        <Card key={k.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <k.icon className={`size-4 ${k.color ?? "text-muted-foreground"}`} />
            </div>
            <div className={`mt-2 font-display text-2xl font-semibold ${k.color ?? ""}`}>{k.value}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-2 md:col-span-3">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Les indicateurs détaillés (temps d'attente, sorties à contrôler, incidents) apparaîtront au fil des Lots 2 et 3.
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- LOGEMENTS (lecture + statut) ---------- */
function LogementsTab({ chantierId, canManage }: { chantierId: string; canManage: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("logements")
        .select("id, numero, phase, statut, sensibilite, consignes, niveau_id, niveaux!inner(nom, bloc_id, blocs!inner(nom, batiment_id, batiments!inner(nom, chantier_id)))")
        .eq("niveaux.blocs.batiments.chantier_id", chantierId)
        .order("numero");
      if (error) return toast.error(error.message);
      setRows(data ?? []);
    })();
  }, [chantierId, reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.numero.toLowerCase().includes(q));
  }, [rows, search]);

  const setStatut = async (id: string, statut: string) => {
    const { error } = await supabase.from("logements").update({ statut: statut as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    setReload((r) => r + 1);
  };

  return (
    <div className="space-y-3">
      <Input placeholder="Rechercher un numéro de logement…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logement</TableHead>
                <TableHead>Bâtiment / Bloc / Niveau</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Sensibilité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Aucun logement.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.numero}</TableCell>
                  <TableCell className="text-sm">
                    {r.niveaux?.blocs?.batiments?.nom} / {r.niveaux?.blocs?.nom} / {r.niveaux?.nom}
                  </TableCell>
                  <TableCell><Badge variant="outline">{PHASE_LABEL[r.phase] ?? r.phase}</Badge></TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select value={r.statut} onValueChange={(v) => setStatut(r.id, v)}>
                        <SelectTrigger className={`h-8 w-52 border ${STATUT_COLOR[r.statut] ?? ""}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUT_LABEL).map(([k, l]) => (
                            <SelectItem key={k} value={k}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={STATUT_COLOR[r.statut] ?? ""}>{STATUT_LABEL[r.statut] ?? r.statut}</Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{r.sensibilite}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- CLÉS / TROUSSEAUX ---------- */
function ClesTab({ chantierId, canManage, userId }: { chantierId: string; canManage: boolean; userId: string | null }) {
  const [trousseaux, setTrousseaux] = useState<Trousseau[]>([]);
  const [logements, setLogements] = useState<Logement[]>([]);
  const [reload, setReload] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState<Trousseau | null>(null);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);

  useEffect(() => {
    (async () => {
      const [t, l] = await Promise.all([
        supabase.from("trousseaux").select("*").eq("chantier_id", chantierId).order("reference"),
        supabase.from("logements").select("id, niveau_id, numero, phase, statut, sensibilite, consignes")
          .order("numero"),
      ]);
      if (t.error) toast.error(t.error.message);
      setTrousseaux((t.data ?? []) as Trousseau[]);
      setLogements((l.data ?? []) as Logement[]);
    })();
  }, [chantierId, reload]);

  const openTrousseau = async (t: Trousseau) => {
    setSelected(t);
    const { data } = await supabase.from("mouvements_cles").select("*").eq("trousseau_id", t.id).order("created_at", { ascending: false }).limit(50);
    setMouvements((data ?? []) as Mouvement[]);
  };

  const onScan = async (code: string) => {
    setScanOpen(false);
    const t = trousseaux.find((x) => x.qr_code === code || x.reference === code);
    if (t) openTrousseau(t);
    else toast.error("Trousseau introuvable pour ce code : " + code);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" onClick={() => setScanOpen(true)}>
          <ScanLine className="size-4 mr-1" /> Scanner un QR
        </Button>
        {canManage && <NewTrousseauDialog chantierId={chantierId} onDone={() => setReload((r) => r + 1)} />}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Logement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Clés</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trousseaux.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Aucun trousseau.</TableCell></TableRow>
              ) : trousseaux.map((t) => {
                const logement = logements.find((l) => l.id === t.logement_id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.reference}</TableCell>
                    <TableCell>{logement?.numero ?? "—"}</TableCell>
                    <TableCell>{t.type ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{TROUSSEAU_STATUT_LABEL[t.statut] ?? t.statut}</Badge></TableCell>
                    <TableCell className="text-sm">{t.nb_cles} + {t.nb_doubles} double(s)</TableCell>
                    <TableCell className="text-sm">{t.emplacement ?? "—"}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => openTrousseau(t)}>Ouvrir</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Scanner un QR trousseau</DialogTitle></DialogHeader>
          {scanOpen && <QrScanner onResult={onScan} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <TrousseauDetail
              trousseau={selected}
              logements={logements}
              mouvements={mouvements}
              userId={userId}
              canManage={canManage}
              onChanged={() => { setReload((r) => r + 1); openTrousseau(selected); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewTrousseauDialog({ chantierId, onDone }: { chantierId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [type, setType] = useState("");
  const [nbCles, setNbCles] = useState(1);
  const [nbDoubles, setNbDoubles] = useState(0);
  const [emplacement, setEmplacement] = useState("");
  const [logementId, setLogementId] = useState<string>("none");
  const [logements, setLogements] = useState<Logement[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("logements").select("id, niveau_id, numero, phase, statut, sensibilite, consignes").order("numero");
      setLogements((data ?? []) as Logement[]);
    })();
  }, [open]);

  const submit = async () => {
    if (!reference.trim()) return toast.error("Référence obligatoire");
    setSaving(true);
    const qrCode = crypto.randomUUID();
    const { error } = await supabase.from("trousseaux").insert({
      chantier_id: chantierId,
      reference: reference.trim(),
      qr_code: qrCode,
      type: type || null,
      nb_cles: nbCles,
      nb_doubles: nbDoubles,
      emplacement: emplacement || null,
      logement_id: logementId === "none" ? null : logementId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Trousseau créé");
    setOpen(false);
    setReference(""); setType(""); setNbCles(1); setNbDoubles(0); setEmplacement(""); setLogementId("none");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="size-4 mr-1" /> Nouveau trousseau</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau trousseau</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Référence</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TR-001" /></div>
          <div><Label>Type</Label><Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Entrée principale, boîte aux lettres…" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Nb clés</Label><Input type="number" min={1} value={nbCles} onChange={(e) => setNbCles(Number(e.target.value))} /></div>
            <div><Label>Nb doubles</Label><Input type="number" min={0} value={nbDoubles} onChange={(e) => setNbDoubles(Number(e.target.value))} /></div>
          </div>
          <div><Label>Emplacement de rangement</Label><Input value={emplacement} onChange={(e) => setEmplacement(e.target.value)} /></div>
          <div>
            <Label>Logement associé (optionnel)</Label>
            <Select value={logementId} onValueChange={setLogementId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {logements.map((l) => <SelectItem key={l.id} value={l.id}>{l.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? "…" : "Créer"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrousseauDetail({
  trousseau, logements, mouvements, userId, canManage, onChanged,
}: {
  trousseau: Trousseau; logements: Logement[]; mouvements: Mouvement[];
  userId: string | null; canManage: boolean; onChanged: () => void;
}) {
  const [type, setType] = useState<string>("affectation");
  const [motif, setMotif] = useState("");
  const [destinataire, setDestinataire] = useState("");
  const [saving, setSaving] = useState(false);
  const [newStatut, setNewStatut] = useState<string>(trousseau.statut);

  const logement = logements.find((l) => l.id === trousseau.logement_id);

  const addMouvement = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("mouvements_cles").insert({
      trousseau_id: trousseau.id,
      type: type as any,
      emetteur_id: userId,
      destinataire_libre: destinataire || null,
      motif: motif || null,
      logement_id: trousseau.logement_id,
      created_by: userId,
    });
    if (!error && newStatut !== trousseau.statut) {
      await supabase.from("trousseaux").update({ statut: newStatut }).eq("id", trousseau.id);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Mouvement enregistré");
    setMotif(""); setDestinataire("");
    onChanged();
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-5" /> Trousseau {trousseau.reference}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Logement :</span> {logement?.numero ?? "—"}</div>
          <div><span className="text-muted-foreground">Type :</span> {trousseau.type ?? "—"}</div>
          <div><span className="text-muted-foreground">Clés :</span> {trousseau.nb_cles} + {trousseau.nb_doubles} double(s)</div>
          <div><span className="text-muted-foreground">Emplacement :</span> {trousseau.emplacement ?? "—"}</div>
          <div><span className="text-muted-foreground">Statut :</span> <Badge variant="secondary">{TROUSSEAU_STATUT_LABEL[trousseau.statut]}</Badge></div>
        </div>
        <div className="flex flex-col items-center justify-center">
          {trousseau.qr_code && (
            <>
              <QRCodeSVG value={trousseau.qr_code} size={128} />
              <div className="mt-1 text-xs text-muted-foreground break-all text-center max-w-40">{trousseau.qr_code.slice(0, 8)}…</div>
            </>
          )}
        </div>
      </div>

      {canManage && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium text-sm">Enregistrer un mouvement</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MOUV_TYPE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nouveau statut</Label>
              <Select value={newStatut} onValueChange={setNewStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TROUSSEAU_STATUT_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Destinataire (compagnon, entreprise, personne)</Label><Input value={destinataire} onChange={(e) => setDestinataire(e.target.value)} /></div>
          <div><Label>Motif / commentaire</Label><Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} /></div>
          <Button onClick={addMouvement} disabled={saving} size="sm">Enregistrer</Button>
        </div>
      )}

      <div>
        <div className="font-medium text-sm mb-2">Historique</div>
        {mouvements.length === 0 ? (
          <div className="text-xs text-muted-foreground">Aucun mouvement pour ce trousseau.</div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {mouvements.map((m) => (
              <div key={m.id} className="text-xs border rounded px-2 py-1.5">
                <div className="flex justify-between">
                  <span className="font-medium">{MOUV_TYPE_LABEL[m.type] ?? m.type}</span>
                  <span className="text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                </div>
                {m.destinataire_libre && <div>→ {m.destinataire_libre}</div>}
                {m.motif && <div className="text-muted-foreground">{m.motif}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QrScanner({ onResult }: { onResult: (code: string) => void }) {
  const [manual, setManual] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let scanner: any = null;
    let active = true;
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        scanner = new mod.Html5Qrcode("qr-reader");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decoded: string) => { if (active) { active = false; scanner?.stop().catch(() => {}); onResult(decoded); } },
          () => {},
        );
        setStarting(false);
      } catch (e: any) {
        setStarting(false);
        toast.error("Impossible d'ouvrir la caméra : " + (e?.message ?? "inconnue"));
      }
    })();
    return () => { active = false; scanner?.stop().catch(() => {}); };
  }, [onResult]);

  return (
    <div className="space-y-3">
      <div id="qr-reader" className="w-full min-h-[240px] rounded overflow-hidden bg-black/5" />
      {starting && <div className="text-xs text-muted-foreground">Ouverture de la caméra…</div>}
      <div className="pt-2 border-t">
        <Label className="text-xs">Ou saisir la référence manuellement</Label>
        <div className="flex gap-2 mt-1">
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="TR-001" />
          <Button size="sm" onClick={() => manual.trim() && onResult(manual.trim())}>OK</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- PRISE DE POSTE ---------- */
function PrisePosteTab({ chantierId, userId, roles }: { chantierId: string; userId: string | null; roles: AppRole[] }) {
  const isGestionnaire = roles.includes("gestionnaire_cles") || roles.includes("admin");
  const [poste, setPoste] = useState<any | null>(null);
  const [trousseaux, setTrousseaux] = useState<Trousseau[]>([]);
  const [zone, setZone] = useState("");
  const [telOk, setTelOk] = useState(true);
  const [connOk, setConnOk] = useState(true);
  const [consignes, setConsignes] = useState("");
  const [inventaire, setInventaire] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!userId) return;
    const [p, t] = await Promise.all([
      supabase.from("prises_poste").select("*").eq("gestionnaire_id", userId).eq("chantier_id", chantierId)
        .is("fin_at", null).order("debut_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("trousseaux").select("*").eq("chantier_id", chantierId).order("reference"),
    ]);
    setPoste(p.data);
    setTrousseaux((t.data ?? []) as Trousseau[]);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [userId, chantierId]);

  const start = async () => {
    if (!userId) return;
    const inv = Object.entries(inventaire).map(([trousseau_id, etat]) => ({ trousseau_id, etat }));
    const ecarts = inv.filter((i) => i.etat !== "present_conforme");
    const { error } = await supabase.from("prises_poste").insert({
      gestionnaire_id: userId, chantier_id: chantierId, zone,
      telephone_ok: telOk, connexion_ok: connOk, consignes_jour: consignes,
      inventaire: inv, ecarts,
    });
    if (error) return toast.error(error.message);
    toast.success("Prise de poste validée");
    setZone(""); setConsignes(""); setInventaire({});
    refresh();
  };

  const endShift = async () => {
    if (!poste) return;
    const { error } = await supabase.from("prises_poste").update({ fin_at: new Date().toISOString() }).eq("id", poste.id);
    if (error) return toast.error(error.message);
    toast.success("Poste clôturé");
    refresh();
  };

  if (!isGestionnaire) {
    return <Placeholder title="Prise de poste" hint="Réservé aux gestionnaires de clés." />;
  }
  if (loading) return <div className="text-sm text-muted-foreground">Chargement…</div>;

  if (poste) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LogIn className="size-4 text-emerald-600" /> Poste en cours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Zone :</span> {poste.zone ?? "—"}</div>
          <div><span className="text-muted-foreground">Début :</span> {new Date(poste.debut_at).toLocaleString("fr-FR")}</div>
          <div><span className="text-muted-foreground">Inventaire :</span> {(poste.inventaire ?? []).length} trousseau(x), {(poste.ecarts ?? []).length} écart(s)</div>
          {poste.consignes_jour && <div><span className="text-muted-foreground">Consignes :</span> {poste.consignes_jour}</div>}
          <Button variant="outline" size="sm" onClick={endShift}><LogOut className="size-4 mr-1" /> Terminer le poste</Button>
        </CardContent>
      </Card>
    );
  }

  const nonRenseignes = trousseaux.filter((t) => !inventaire[t.id]).length;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Nouvelle prise de poste</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Zone d'affectation</Label><Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Bâtiment A – niveaux 1 à 3" /></div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={telOk} onCheckedChange={(v) => setTelOk(!!v)} /> Téléphone fonctionnel</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={connOk} onCheckedChange={(v) => setConnOk(!!v)} /> Connexion à l'application</label>
          </div>
          <div><Label>Consignes du jour</Label><Textarea rows={2} value={consignes} onChange={(e) => setConsignes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Inventaire des trousseaux ({trousseaux.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Référence</TableHead><TableHead>Type</TableHead><TableHead>État constaté</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {trousseaux.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.reference}</TableCell>
                  <TableCell>{t.type ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={inventaire[t.id] ?? ""} onValueChange={(v) => setInventaire((p) => ({ ...p, [t.id]: v }))}>
                      <SelectTrigger className="h-8 w-56"><SelectValue placeholder="À renseigner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present_conforme">Présent et conforme</SelectItem>
                        <SelectItem value="manquant">Manquant</SelectItem>
                        <SelectItem value="incomplet">Incomplet</SelectItem>
                        <SelectItem value="endommage">Endommagé</SelectItem>
                        <SelectItem value="deja_sorti">Déjà sorti</SelectItem>
                        <SelectItem value="transmis">Transmis par un autre gestionnaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={start} disabled={nonRenseignes > 0}>Valider la prise de poste</Button>
        {nonRenseignes > 0 && <span className="text-xs text-muted-foreground">{nonRenseignes} trousseau(x) restent à renseigner.</span>}
      </div>
    </div>
  );
}

/* ---------- PARAMÈTRES (structure + lots + compagnons) ---------- */
function ParametresTab({ chantierId, canManage }: { chantierId: string; canManage: boolean }) {
  return (
    <Tabs defaultValue="structure" className="space-y-4">
      <TabsList>
        <TabsTrigger value="structure"><Building2 className="size-4 mr-1" /> Structure</TabsTrigger>
        <TabsTrigger value="lots"><Wrench className="size-4 mr-1" /> Lots</TabsTrigger>
        <TabsTrigger value="compagnons"><UsersRound className="size-4 mr-1" /> Compagnons</TabsTrigger>
      </TabsList>
      <TabsContent value="structure"><StructureTab chantierId={chantierId} canManage={canManage} /></TabsContent>
      <TabsContent value="lots"><LotsTab chantierId={chantierId} canManage={canManage} /></TabsContent>
      <TabsContent value="compagnons"><CompagnonsTab canManage={canManage} /></TabsContent>
    </Tabs>
  );
}

function StructureTab({ chantierId, canManage }: { chantierId: string; canManage: boolean }) {
  const [batiments, setBatiments] = useState<Batiment[]>([]);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [logements, setLogements] = useState<Logement[]>([]);
  const [reload, setReload] = useState(0);

  // form states
  const [newBat, setNewBat] = useState("");
  const [newBlocFor, setNewBlocFor] = useState<string>("");
  const [newBlocName, setNewBlocName] = useState("");
  const [newNivFor, setNewNivFor] = useState<string>("");
  const [newNivName, setNewNivName] = useState("");
  const [newLogFor, setNewLogFor] = useState<string>("");
  const [newLogNum, setNewLogNum] = useState("");
  const [newLogPhase, setNewLogPhase] = useState<string>("opr");

  useEffect(() => {
    (async () => {
      const bat = await supabase.from("batiments").select("*").eq("chantier_id", chantierId).order("nom");
      setBatiments((bat.data ?? []) as Batiment[]);
      const batIds = (bat.data ?? []).map((b: any) => b.id);
      if (batIds.length === 0) { setBlocs([]); setNiveaux([]); setLogements([]); return; }
      const bl = await supabase.from("blocs").select("*").in("batiment_id", batIds).order("nom");
      setBlocs((bl.data ?? []) as Bloc[]);
      const blIds = (bl.data ?? []).map((b: any) => b.id);
      if (blIds.length === 0) { setNiveaux([]); setLogements([]); return; }
      const nv = await supabase.from("niveaux").select("*").in("bloc_id", blIds).order("ordre");
      setNiveaux((nv.data ?? []) as Niveau[]);
      const nvIds = (nv.data ?? []).map((n: any) => n.id);
      if (nvIds.length === 0) { setLogements([]); return; }
      const lg = await supabase.from("logements").select("id, niveau_id, numero, phase, statut, sensibilite, consignes").in("niveau_id", nvIds).order("numero");
      setLogements((lg.data ?? []) as Logement[]);
    })();
  }, [chantierId, reload]);

  const addBat = async () => {
    if (!newBat.trim()) return;
    const { error } = await supabase.from("batiments").insert({ chantier_id: chantierId, nom: newBat.trim() });
    if (error) return toast.error(error.message);
    setNewBat(""); setReload((r) => r + 1);
  };
  const addBloc = async () => {
    if (!newBlocFor || !newBlocName.trim()) return;
    const { error } = await supabase.from("blocs").insert({ batiment_id: newBlocFor, nom: newBlocName.trim() });
    if (error) return toast.error(error.message);
    setNewBlocName(""); setReload((r) => r + 1);
  };
  const addNiv = async () => {
    if (!newNivFor || !newNivName.trim()) return;
    const { error } = await supabase.from("niveaux").insert({ bloc_id: newNivFor, nom: newNivName.trim() });
    if (error) return toast.error(error.message);
    setNewNivName(""); setReload((r) => r + 1);
  };
  const addLog = async () => {
    if (!newLogFor || !newLogNum.trim()) return;
    const { error } = await supabase.from("logements").insert({
      niveau_id: newLogFor, numero: newLogNum.trim(), phase: newLogPhase as any,
    });
    if (error) return toast.error(error.message);
    setNewLogNum(""); setReload((r) => r + 1);
  };
  const del = async (table: string, id: string) => {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReload((r) => r + 1);
  };

  if (!canManage) return <Placeholder title="Structure" hint="Consultation uniquement — création réservée aux conducteurs/admins." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building className="size-4" /> Bâtiments</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2"><Input value={newBat} onChange={(e) => setNewBat(e.target.value)} placeholder="Nom du bâtiment" /><Button size="sm" onClick={addBat}><Plus className="size-4" /></Button></div>
          <ul className="space-y-1 text-sm">
            {batiments.map((b) => (
              <li key={b.id} className="flex justify-between border rounded px-2 py-1">
                <span>{b.nom}</span>
                <Button size="icon" variant="ghost" onClick={() => del("batiments", b.id)}><Trash2 className="size-3" /></Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Blocs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Select value={newBlocFor} onValueChange={setNewBlocFor}>
              <SelectTrigger><SelectValue placeholder="Bâtiment parent" /></SelectTrigger>
              <SelectContent>{batiments.map((b) => <SelectItem key={b.id} value={b.id}>{b.nom}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-2"><Input value={newBlocName} onChange={(e) => setNewBlocName(e.target.value)} placeholder="Nom du bloc" /><Button size="sm" onClick={addBloc}><Plus className="size-4" /></Button></div>
          </div>
          <ul className="space-y-1 text-sm max-h-56 overflow-auto">
            {blocs.map((b) => {
              const bat = batiments.find((x) => x.id === b.batiment_id);
              return (
                <li key={b.id} className="flex justify-between border rounded px-2 py-1">
                  <span>{bat?.nom} / {b.nom}</span>
                  <Button size="icon" variant="ghost" onClick={() => del("blocs", b.id)}><Trash2 className="size-3" /></Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="size-4" /> Niveaux</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Select value={newNivFor} onValueChange={setNewNivFor}>
              <SelectTrigger><SelectValue placeholder="Bloc parent" /></SelectTrigger>
              <SelectContent>
                {blocs.map((b) => {
                  const bat = batiments.find((x) => x.id === b.batiment_id);
                  return <SelectItem key={b.id} value={b.id}>{bat?.nom} / {b.nom}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <div className="flex gap-2"><Input value={newNivName} onChange={(e) => setNewNivName(e.target.value)} placeholder="Nom (R+0, R+1…)" /><Button size="sm" onClick={addNiv}><Plus className="size-4" /></Button></div>
          </div>
          <ul className="space-y-1 text-sm max-h-56 overflow-auto">
            {niveaux.map((n) => {
              const bl = blocs.find((x) => x.id === n.bloc_id);
              return (
                <li key={n.id} className="flex justify-between border rounded px-2 py-1">
                  <span>{bl?.nom} / {n.nom}</span>
                  <Button size="icon" variant="ghost" onClick={() => del("niveaux", n.id)}><Trash2 className="size-3" /></Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="size-4" /> Logements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Select value={newLogFor} onValueChange={setNewLogFor}>
              <SelectTrigger><SelectValue placeholder="Niveau parent" /></SelectTrigger>
              <SelectContent>
                {niveaux.map((n) => {
                  const bl = blocs.find((x) => x.id === n.bloc_id);
                  const bat = bl && batiments.find((x) => x.id === bl.batiment_id);
                  return <SelectItem key={n.id} value={n.id}>{bat?.nom} / {bl?.nom} / {n.nom}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input value={newLogNum} onChange={(e) => setNewLogNum(e.target.value)} placeholder="Numéro (A101)" />
              <Select value={newLogPhase} onValueChange={setNewLogPhase}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PHASE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" onClick={addLog}><Plus className="size-4" /></Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{logements.length} logement(s) enregistré(s).</div>
        </CardContent>
      </Card>
    </div>
  );
}

function LotsTab({ chantierId, canManage }: { chantierId: string; canManage: boolean }) {
  const [rows, setRows] = useState<Lot[]>([]);
  const [nom, setNom] = useState(""); const [code, setCode] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lots").select("*").eq("chantier_id", chantierId).order("nom");
      setRows((data ?? []) as Lot[]);
    })();
  }, [chantierId, reload]);
  const add = async () => {
    if (!nom.trim()) return;
    const { error } = await supabase.from("lots").insert({ chantier_id: chantierId, nom: nom.trim(), code: code || null });
    if (error) return toast.error(error.message);
    setNom(""); setCode(""); setReload((r) => r + 1);
  };
  const del = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("lots").delete().eq("id", id);
    setReload((r) => r + 1);
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Lots / corps d'état</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {canManage && (
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (05, 06…)" className="w-32" />
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom (Peinture, Plomberie…)" />
            <Button size="sm" onClick={add}><Plus className="size-4" /></Button>
          </div>
        )}
        <ul className="space-y-1 text-sm">
          {rows.map((l) => (
            <li key={l.id} className="flex justify-between border rounded px-2 py-1">
              <span>{l.code && <span className="text-muted-foreground mr-2">{l.code}</span>}{l.nom}</span>
              {canManage && <Button size="icon" variant="ghost" onClick={() => del(l.id)}><Trash2 className="size-3" /></Button>}
            </li>
          ))}
          {rows.length === 0 && <li className="text-xs text-muted-foreground">Aucun lot.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}

function CompagnonsTab({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<Compagnon[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [reload, setReload] = useState(0);
  const [nom, setNom] = useState(""); const [prenom, setPrenom] = useState("");
  const [tel, setTel] = useState(""); const [entrepriseId, setEntrepriseId] = useState<string>("none");

  useEffect(() => {
    (async () => {
      const [c, e] = await Promise.all([
        supabase.from("compagnons").select("*").order("nom"),
        supabase.from("entreprises").select("id, nom").order("nom"),
      ]);
      setRows((c.data ?? []) as Compagnon[]);
      setEntreprises((e.data ?? []) as Entreprise[]);
    })();
  }, [reload]);

  const add = async () => {
    if (!nom.trim()) return toast.error("Nom requis");
    const { error } = await supabase.from("compagnons").insert({
      nom: nom.trim(), prenom: prenom || null, telephone: tel || null,
      entreprise_id: entrepriseId === "none" ? null : entrepriseId,
    });
    if (error) return toast.error(error.message);
    setNom(""); setPrenom(""); setTel(""); setEntrepriseId("none"); setReload((r) => r + 1);
  };
  const del = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("compagnons").delete().eq("id", id);
    setReload((r) => r + 1);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Compagnons</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {canManage && (
          <div className="grid gap-2 md:grid-cols-5">
            <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" />
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
            <Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Téléphone" />
            <Select value={entrepriseId} onValueChange={setEntrepriseId}>
              <SelectTrigger><SelectValue placeholder="Entreprise" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {entreprises.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={add}><Plus className="size-4 mr-1" /> Ajouter</Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow><TableHead>Compagnon</TableHead><TableHead>Entreprise</TableHead><TableHead>Téléphone</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const e = entreprises.find((x) => x.id === c.entreprise_id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.prenom} {c.nom}</TableCell>
                  <TableCell>{e?.nom ?? "—"}</TableCell>
                  <TableCell>{c.telephone ?? "—"}</TableCell>
                  <TableCell>{canManage && <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="size-3" /></Button>}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">Aucun compagnon.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
