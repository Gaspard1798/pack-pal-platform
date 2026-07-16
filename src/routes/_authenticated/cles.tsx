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
  Camera, Check, X, PlayCircle, StopCircle, AlertTriangle, FileWarning,
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
            <TabsTrigger value="parametres">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab chantierId={chantierId} /></TabsContent>
          <TabsContent value="demandes"><DemandesTab chantierId={chantierId} userId={user?.id ?? null} roles={roles} /></TabsContent>
          <TabsContent value="logements"><LogementsTab chantierId={chantierId} canManage={canManage} /></TabsContent>
          <TabsContent value="cles"><ClesTab chantierId={chantierId} canManage={canManage} userId={user?.id ?? null} /></TabsContent>
          <TabsContent value="interventions"><InterventionsTab chantierId={chantierId} userId={user?.id ?? null} roles={roles} /></TabsContent>
          <TabsContent value="nc"><NonConformitesTab chantierId={chantierId} userId={user?.id ?? null} canManage={canManage} /></TabsContent>
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
    sorties_ctrl: 0, trousseaux: 0, non_restitues: 0,
    nc_ouvertes: 0, nc_critiques: 0, nc_resolues_30j: 0,
    duree_moy_min: 0, interv_30j: 0,
  });
  const [ncParCat, setNcParCat] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [logs, trs, ncs, intervs] = await Promise.all([
        supabase.from("logements").select("id, statut, niveau_id, niveaux!inner(bloc_id, blocs!inner(batiment_id, batiments!inner(chantier_id)))")
          .eq("niveaux.blocs.batiments.chantier_id", chantierId),
        supabase.from("trousseaux").select("id, statut").eq("chantier_id", chantierId),
        supabase.from("non_conformites").select("id, statut, gravite, categorie, created_at, resolue_at").eq("chantier_id", chantierId),
        supabase.from("interventions").select("id, heure_ouverture, heure_fermeture, statut, created_at")
          .eq("chantier_id", chantierId).gte("created_at", since30),
      ]);
      const logements = (logs.data ?? []) as any[];
      const trousseaux = (trs.data ?? []) as any[];
      const nc = (ncs.data ?? []) as any[];
      const iv = (intervs.data ?? []) as any[];

      const ivTerm = iv.filter((i) => i.heure_fermeture);
      const dureeMoy = ivTerm.length
        ? Math.round(ivTerm.reduce((s, i) => s + (new Date(i.heure_fermeture).getTime() - new Date(i.heure_ouverture).getTime()), 0) / ivTerm.length / 60000)
        : 0;
      const cats: Record<string, number> = {};
      nc.filter((n) => n.statut !== "cloturee" && n.statut !== "resolue")
        .forEach((n) => { cats[n.categorie] = (cats[n.categorie] ?? 0) + 1; });

      setStats({
        logements: logements.length,
        ouverts: logements.filter((l) => ["ouverture_en_cours", "intervention_en_cours"].includes(l.statut)).length,
        interventions: logements.filter((l) => l.statut === "intervention_en_cours").length,
        bloques: logements.filter((l) => ["bloque", "impossible_securiser", "non_conforme"].includes(l.statut)).length,
        sorties_ctrl: logements.filter((l) => l.statut === "sortie_a_controler").length,
        trousseaux: trousseaux.length,
        non_restitues: trousseaux.filter((t) => t.statut === "non_restitue").length,
        nc_ouvertes: nc.filter((n) => n.statut === "ouverte" || n.statut === "en_cours").length,
        nc_critiques: nc.filter((n) => (n.gravite === "critique" || n.gravite === "bloquante") && n.statut !== "cloturee" && n.statut !== "resolue").length,
        nc_resolues_30j: nc.filter((n) => n.resolue_at && n.resolue_at >= since30).length,
        duree_moy_min: dureeMoy,
        interv_30j: iv.length,
      });
      setNcParCat(cats);
    })();
  }, [chantierId]);

  const kpis = [
    { label: "Logements", value: stats.logements, icon: Home },
    { label: "Actuellement ouverts", value: stats.ouverts, icon: LogIn, color: "text-blue-600" },
    { label: "Interventions en cours", value: stats.interventions, icon: Wrench, color: "text-blue-600" },
    { label: "Sorties à contrôler", value: stats.sorties_ctrl, icon: LogOut, color: "text-orange-600" },
    { label: "Bloqués / NC statut", value: stats.bloques, icon: ClipboardList, color: "text-red-600" },
    { label: "Trousseaux enregistrés", value: stats.trousseaux, icon: KeyRound },
    { label: "Clés non restituées", value: stats.non_restitues, icon: KeyRound, color: "text-red-600" },
    { label: "NC ouvertes", value: stats.nc_ouvertes, icon: FileWarning, color: "text-orange-600" },
    { label: "NC critiques/bloquantes", value: stats.nc_critiques, icon: AlertTriangle, color: "text-red-600" },
    { label: "NC résolues (30j)", value: stats.nc_resolues_30j, icon: Check, color: "text-emerald-600" },
    { label: "Interventions (30j)", value: stats.interv_30j, icon: PlayCircle },
    { label: "Durée moy. intervention", value: stats.duree_moy_min ? `${stats.duree_moy_min} min` : "—", icon: StopCircle },
  ];

  const catLabels: Record<string, string> = {
    securite: "Sécurité", cle: "Clés", logement: "Logement", proprete: "Propreté", autre: "Autre",
  };
  const totalCat = Object.values(ncParCat).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Non-conformités ouvertes par catégorie</CardTitle></CardHeader>
        <CardContent>
          {totalCat === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune non-conformité ouverte.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(ncParCat).map(([cat, n]) => {
                const pct = Math.round((n / totalCat) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{catLabels[cat] ?? cat}</span><span className="text-muted-foreground">{n} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
      <div className="flex flex-wrap gap-2 items-end justify-between">
        <Input placeholder="Rechercher un numéro de logement…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        {canManage && <NewLogementDialog chantierId={chantierId} onDone={() => setReload((r) => r + 1)} />}
      </div>
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

function NewLogementDialog({ chantierId, onDone }: { chantierId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [batiments, setBatiments] = useState<Batiment[]>([]);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [batId, setBatId] = useState<string>("");
  const [blocId, setBlocId] = useState<string>("");
  const [niveauId, setNiveauId] = useState<string>("");
  const [numero, setNumero] = useState("");
  const [phase, setPhase] = useState<string>("opr");
  const [sensibilite, setSensibilite] = useState<string>("standard");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: b } = await supabase.from("batiments").select("*").eq("chantier_id", chantierId).order("nom");
      setBatiments((b ?? []) as Batiment[]);
    })();
    setBatId(""); setBlocId(""); setNiveauId(""); setNumero(""); setPhase("opr"); setSensibilite("standard");
  }, [open, chantierId]);

  useEffect(() => {
    setBlocs([]); setBlocId(""); setNiveaux([]); setNiveauId("");
    if (!batId) return;
    (async () => {
      const { data } = await supabase.from("blocs").select("*").eq("batiment_id", batId).order("nom");
      setBlocs((data ?? []) as Bloc[]);
    })();
  }, [batId]);

  useEffect(() => {
    setNiveaux([]); setNiveauId("");
    if (!blocId) return;
    (async () => {
      const { data } = await supabase.from("niveaux").select("*").eq("bloc_id", blocId).order("ordre");
      setNiveaux((data ?? []) as Niveau[]);
    })();
  }, [blocId]);

  const submit = async () => {
    if (!niveauId || !numero.trim()) return toast.error("Niveau et numéro requis");
    setSaving(true);
    const { error } = await supabase.from("logements").insert({
      niveau_id: niveauId, numero: numero.trim(), phase: phase as any, sensibilite: sensibilite as any,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Logement ajouté");
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4 mr-1" /> Ajouter un logement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Ajouter un logement</DialogTitle></DialogHeader>
        {batiments.length === 0 && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
            Aucun bâtiment n'existe pour ce chantier. Créez d'abord la structure (bâtiment, bloc, niveau) dans l'onglet <strong>Paramètres &gt; Structure</strong>.
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label>Bâtiment</Label>
            <Select value={batId} onValueChange={setBatId}>
              <SelectTrigger><SelectValue placeholder="Choisir un bâtiment" /></SelectTrigger>
              <SelectContent>{batiments.map((b) => <SelectItem key={b.id} value={b.id}>{b.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bloc</Label>
            <Select value={blocId} onValueChange={setBlocId} disabled={!batId}>
              <SelectTrigger><SelectValue placeholder="Choisir un bloc" /></SelectTrigger>
              <SelectContent>{blocs.map((b) => <SelectItem key={b.id} value={b.id}>{b.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Niveau</Label>
            <Select value={niveauId} onValueChange={setNiveauId} disabled={!blocId}>
              <SelectTrigger><SelectValue placeholder="Choisir un niveau" /></SelectTrigger>
              <SelectContent>{niveaux.map((n) => <SelectItem key={n.id} value={n.id}>{n.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Numéro</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: A101" />
            </div>
            <div>
              <Label>Phase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PHASE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Sensibilité</Label>
            <Select value={sensibilite} onValueChange={setSensibilite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="haute">Haute</SelectItem>
                <SelectItem value="critique">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving || !niveauId || !numero.trim()}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      await supabase.from("trousseaux").update({ statut: newStatut as any }).eq("id", trousseau.id);
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
  const del = async (table: "batiments" | "blocs" | "niveaux" | "logements", id: string) => {
    if (!confirm("Supprimer ?")) return;
    const { error } = await (supabase.from(table) as any).delete().eq("id", id);
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

/* ---------- DEMANDES D'ACCÈS ---------- */
type DemandeAcces = {
  id: string; chantier_id: string; logement_id: string; demandeur_id: string;
  compagnon_id: string | null; lot_id: string | null;
  motif: string; date_prevue: string; heure_debut: string; heure_fin: string;
  urgence: "normale" | "prioritaire" | "urgente";
  statut: "en_attente" | "acceptee" | "refusee" | "terminee" | "annulee";
  raison_refus: string | null; created_at: string;
};

const DEMANDE_LABEL: Record<DemandeAcces["statut"], string> = {
  en_attente: "En attente", acceptee: "Acceptée", refusee: "Refusée",
  terminee: "Terminée", annulee: "Annulée",
};
const DEMANDE_VARIANT: Record<DemandeAcces["statut"], "default" | "secondary" | "destructive" | "outline"> = {
  en_attente: "secondary", acceptee: "default", refusee: "destructive",
  terminee: "outline", annulee: "outline",
};

function DemandesTab({ chantierId, userId, roles }: { chantierId: string; userId: string | null; roles: AppRole[] }) {
  const canValidate = hasAny(roles, ["admin", "conducteur", "gestionnaire_cles"]);
  const canCreate = hasAny(roles, ["prestataire", "admin", "conducteur", "gestionnaire_cles"]);
  const [rows, setRows] = useState<DemandeAcces[]>([]);
  const [logements, setLogements] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"tous" | DemandeAcces["statut"]>("tous");
  const [reason, setReason] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: d } = await supabase.from("demandes_acces").select("*")
      .eq("chantier_id", chantierId).order("created_at", { ascending: false });
    setRows((d ?? []) as any);
    const { data: b } = await supabase.from("batiments").select("id").eq("chantier_id", chantierId);
    const bIds = (b ?? []).map((x: any) => x.id);
    if (bIds.length) {
      const { data: bl } = await supabase.from("blocs").select("id").in("batiment_id", bIds);
      const blIds = (bl ?? []).map((x: any) => x.id);
      if (blIds.length) {
        const { data: nv } = await supabase.from("niveaux").select("id").in("bloc_id", blIds);
        const nvIds = (nv ?? []).map((x: any) => x.id);
        if (nvIds.length) {
          const { data: lg } = await supabase.from("logements").select("id, numero").in("niveau_id", nvIds);
          const map: Record<string, string> = {};
          (lg ?? []).forEach((x: any) => { map[x.id] = x.numero; });
          setLogements(map);
        }
      }
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [chantierId]);

  const setStatut = async (id: string, statut: DemandeAcces["statut"], raison?: string) => {
    const patch: any = { statut };
    if (raison) patch.raison_refus = raison;
    if (userId) patch.valide_par = userId;
    const { error } = await supabase.from("demandes_acces").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Demande mise à jour");
    load();
  };

  const filtered = rows.filter((r) => filter === "tous" || r.statut === filter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="size-4" /> Demandes d'accès logements</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="acceptee">Acceptées</SelectItem>
              <SelectItem value="refusee">Refusées</SelectItem>
              <SelectItem value="terminee">Terminées</SelectItem>
              <SelectItem value="annulee">Annulées</SelectItem>
            </SelectContent>
          </Select>
          {canCreate && userId && <NewDemandeDialog chantierId={chantierId} userId={userId} onDone={load} />}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logement</TableHead><TableHead>Motif</TableHead>
              <TableHead>Date</TableHead><TableHead>Créneau</TableHead>
              <TableHead>Urgence</TableHead><TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{logements[d.logement_id] ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate" title={d.motif}>{d.motif}</TableCell>
                <TableCell>{new Date(d.date_prevue).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>{d.heure_debut.slice(0,5)}–{d.heure_fin.slice(0,5)}</TableCell>
                <TableCell>
                  <Badge variant={d.urgence === "urgente" ? "destructive" : d.urgence === "prioritaire" ? "default" : "secondary"}>
                    {d.urgence}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant={DEMANDE_VARIANT[d.statut]}>{DEMANDE_LABEL[d.statut]}</Badge></TableCell>
                <TableCell className="text-right">
                  {d.statut === "en_attente" && canValidate && (
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setStatut(d.id, "acceptee")}>
                        <Check className="size-3 mr-1" />Accepter
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive"><X className="size-3 mr-1" />Refuser</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Motif de refus</DialogTitle></DialogHeader>
                          <Textarea
                            placeholder="Raison du refus…"
                            value={reason[d.id] ?? ""}
                            onChange={(e) => setReason((r) => ({ ...r, [d.id]: e.target.value }))}
                          />
                          <DialogFooter>
                            <Button variant="destructive" onClick={() => setStatut(d.id, "refusee", reason[d.id])}>
                              Confirmer le refus
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  {d.statut === "en_attente" && d.demandeur_id === userId && (
                    <Button size="sm" variant="ghost" onClick={() => setStatut(d.id, "annulee")}>Annuler</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                Aucune demande.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NewDemandeDialog({ chantierId, userId, onDone }: { chantierId: string; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [logements, setLogements] = useState<Array<{ id: string; numero: string }>>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [compagnons, setCompagnons] = useState<Compagnon[]>([]);
  const [logementId, setLogementId] = useState("");
  const [lotId, setLotId] = useState<string>("");
  const [compagnonId, setCompagnonId] = useState<string>("");
  const [motif, setMotif] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hDebut, setHDebut] = useState("08:00");
  const [hFin, setHFin] = useState("12:00");
  const [urgence, setUrgence] = useState<"normale" | "prioritaire" | "urgente">("normale");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: b } = await supabase.from("batiments").select("id").eq("chantier_id", chantierId);
      const bIds = (b ?? []).map((x: any) => x.id);
      let lgs: any[] = [];
      if (bIds.length) {
        const { data: bl } = await supabase.from("blocs").select("id").in("batiment_id", bIds);
        const blIds = (bl ?? []).map((x: any) => x.id);
        if (blIds.length) {
          const { data: nv } = await supabase.from("niveaux").select("id").in("bloc_id", blIds);
          const nvIds = (nv ?? []).map((x: any) => x.id);
          if (nvIds.length) {
            const { data: lg } = await supabase.from("logements").select("id, numero").in("niveau_id", nvIds).order("numero");
            lgs = lg ?? [];
          }
        }
      }
      setLogements(lgs);
      const { data: lo } = await supabase.from("lots").select("*").eq("chantier_id", chantierId).order("nom");
      setLots((lo ?? []) as Lot[]);
      const { data: co } = await supabase.from("compagnons").select("*").eq("actif", true).order("nom");
      setCompagnons((co ?? []) as Compagnon[]);
    })();
  }, [open, chantierId]);

  const submit = async () => {
    if (!logementId || !motif.trim()) return toast.error("Logement et motif requis");
    if (hDebut >= hFin) return toast.error("Créneau invalide");
    setSaving(true);
    const { error } = await supabase.from("demandes_acces").insert({
      chantier_id: chantierId, logement_id: logementId, demandeur_id: userId,
      lot_id: lotId || null, compagnon_id: compagnonId || null,
      motif: motif.trim(), date_prevue: date, heure_debut: hDebut, heure_fin: hFin,
      urgence: urgence as any,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Demande créée");
    setOpen(false);
    setLogementId(""); setLotId(""); setCompagnonId(""); setMotif("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" /> Nouvelle demande</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvelle demande d'accès</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Logement *</Label>
            <Select value={logementId} onValueChange={setLogementId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {logements.map((l) => <SelectItem key={l.id} value={l.id}>{l.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Lot</Label>
              <Select value={lotId} onValueChange={setLotId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {lots.map((l) => <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Compagnon</Label>
              <Select value={compagnonId} onValueChange={setCompagnonId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {compagnons.map((c) => <SelectItem key={c.id} value={c.id}>{c.prenom} {c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Motif *</Label>
            <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={500} rows={2} placeholder="Nature de l'intervention…" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Début</Label><Input type="time" value={hDebut} onChange={(e) => setHDebut(e.target.value)} /></div>
            <div><Label>Fin</Label><Input type="time" value={hFin} onChange={(e) => setHFin(e.target.value)} /></div>
          </div>
          <div>
            <Label>Urgence</Label>
            <Select value={urgence} onValueChange={(v) => setUrgence(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="prioritaire">Prioritaire</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- INTERVENTIONS (Assistant Entrée / Sortie) ---------- */
type Intervention = {
  id: string; demande_id: string | null; chantier_id: string; logement_id: string;
  compagnon_id: string | null; coureur_id: string; trousseau_id: string | null;
  heure_ouverture: string; heure_fermeture: string | null;
  statut: "en_cours" | "terminee" | "bloquee";
  photos_avant: string[]; photos_apres: string[]; notes: string | null;
};

async function uploadOprPhoto(file: File, chantierId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${chantierId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("opr-photos").upload(path, file, { upsert: false });
  if (error) { toast.error(error.message); return null; }
  return path;
}

function PhotoUploader({ paths, onChange, chantierId, label }: {
  paths: string[]; onChange: (p: string[]) => void; chantierId: string; label: string;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const next: Record<string, string> = {};
      for (const p of paths) {
        const { data } = await supabase.storage.from("opr-photos").createSignedUrl(p, 3600);
        if (data?.signedUrl) next[p] = data.signedUrl;
      }
      setUrls(next);
    })();
  }, [paths]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const added: string[] = [];
    for (const f of Array.from(files)) {
      const p = await uploadOprPhoto(f, chantierId);
      if (p) added.push(p);
    }
    if (added.length) onChange([...paths, ...added]);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => (
          <div key={p} className="relative">
            {urls[p] ? <img src={urls[p]} className="size-16 object-cover rounded border" alt="" /> : <div className="size-16 bg-muted rounded" />}
            <button type="button" onClick={() => onChange(paths.filter((x) => x !== p))}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
              <X className="size-3" />
            </button>
          </div>
        ))}
        <label className="size-16 border border-dashed rounded flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted">
          <Camera className="size-5" />
          <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
    </div>
  );
}

function InterventionsTab({ chantierId, userId, roles }: { chantierId: string; userId: string | null; roles: AppRole[] }) {
  const canOperate = hasAny(roles, ["admin", "conducteur", "gestionnaire_cles", "operateur"]);
  const [rows, setRows] = useState<Intervention[]>([]);
  const [accepted, setAccepted] = useState<DemandeAcces[]>([]);
  const [logements, setLogements] = useState<Record<string, string>>({});
  const [trousseaux, setTrousseaux] = useState<Trousseau[]>([]);

  const load = async () => {
    const { data: iv } = await supabase.from("interventions").select("*")
      .eq("chantier_id", chantierId).order("heure_ouverture", { ascending: false }).limit(100);
    setRows((iv ?? []) as any);
    const { data: dm } = await supabase.from("demandes_acces").select("*")
      .eq("chantier_id", chantierId).eq("statut", "acceptee");
    setAccepted((dm ?? []) as any);
    const { data: t } = await supabase.from("trousseaux").select("*").eq("chantier_id", chantierId);
    setTrousseaux((t ?? []) as any);
    // logements labels
    const { data: b } = await supabase.from("batiments").select("id").eq("chantier_id", chantierId);
    const bIds = (b ?? []).map((x: any) => x.id);
    if (bIds.length) {
      const { data: bl } = await supabase.from("blocs").select("id").in("batiment_id", bIds);
      const blIds = (bl ?? []).map((x: any) => x.id);
      if (blIds.length) {
        const { data: nv } = await supabase.from("niveaux").select("id").in("bloc_id", blIds);
        const nvIds = (nv ?? []).map((x: any) => x.id);
        if (nvIds.length) {
          const { data: lg } = await supabase.from("logements").select("id, numero").in("niveau_id", nvIds);
          const map: Record<string, string> = {};
          (lg ?? []).forEach((x: any) => { map[x.id] = x.numero; });
          setLogements(map);
        }
      }
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [chantierId]);

  const enCours = rows.filter((r) => r.statut === "en_cours");
  const terminees = rows.filter((r) => r.statut !== "en_cours");

  return (
    <div className="space-y-4">
      {canOperate && userId && accepted.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PlayCircle className="size-4" /> Ouvrir une intervention</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {accepted.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded p-2">
                <div className="text-sm">
                  <div className="font-medium">Logement {logements[d.logement_id] ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{d.motif} · {new Date(d.date_prevue).toLocaleDateString("fr-FR")} {d.heure_debut.slice(0,5)}–{d.heure_fin.slice(0,5)}</div>
                </div>
                <OpenInterventionDialog demande={d} userId={userId} chantierId={chantierId} trousseaux={trousseaux} onDone={load} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Interventions en cours ({enCours.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {enCours.map((iv) => (
            <InterventionRow key={iv.id} iv={iv} logements={logements} canOperate={canOperate} onDone={load} chantierId={chantierId} />
          ))}
          {enCours.length === 0 && <div className="text-sm text-muted-foreground">Aucune intervention en cours.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historique récent</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Logement</TableHead><TableHead>Ouverture</TableHead>
              <TableHead>Fermeture</TableHead><TableHead>Statut</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {terminees.slice(0, 30).map((iv) => (
                <TableRow key={iv.id}>
                  <TableCell>{logements[iv.logement_id] ?? "—"}</TableCell>
                  <TableCell>{new Date(iv.heure_ouverture).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>{iv.heure_fermeture ? new Date(iv.heure_fermeture).toLocaleString("fr-FR") : "—"}</TableCell>
                  <TableCell><Badge variant={iv.statut === "bloquee" ? "destructive" : "outline"}>{iv.statut}</Badge></TableCell>
                </TableRow>
              ))}
              {terminees.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">—</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function OpenInterventionDialog({ demande, userId, chantierId, trousseaux, onDone }: {
  demande: DemandeAcces; userId: string; chantierId: string; trousseaux: Trousseau[]; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [trousseauId, setTrousseauId] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { data: iv, error } = await supabase.from("interventions").insert({
      demande_id: demande.id, chantier_id: chantierId, logement_id: demande.logement_id,
      compagnon_id: demande.compagnon_id, coureur_id: userId,
      trousseau_id: trousseauId || null,
      photos_avant: photos, notes: notes.trim() || null,
    } as any).select("id").single();
    if (error) { setSaving(false); return toast.error(error.message); }
    await supabase.from("logements").update({ statut: "intervention_en_cours" as any }).eq("id", demande.logement_id);
    if (trousseauId) {
      await supabase.from("mouvements_cles").insert({
        trousseau_id: trousseauId, type: "ouverture" as any, emetteur_id: userId,
        logement_id: demande.logement_id, note: `Intervention ${iv?.id}`,
      } as any);
    }
    setSaving(false);
    toast.success("Intervention démarrée");
    setOpen(false); setPhotos([]); setNotes(""); setTrousseauId("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><PlayCircle className="size-4 mr-1" /> Démarrer</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Assistant d'entrée</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Motif : {demande.motif}
          </div>
          <div>
            <Label>Trousseau utilisé</Label>
            <Select value={trousseauId} onValueChange={setTrousseauId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {trousseaux.map((t) => <SelectItem key={t.id} value={t.id}>{t.reference}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <PhotoUploader paths={photos} onChange={setPhotos} chantierId={chantierId} label="Photos avant ouverture" />
          <div>
            <Label>Notes d'entrée</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>Démarrer l'intervention</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InterventionRow({ iv, logements, canOperate, onDone, chantierId }: {
  iv: Intervention; logements: Record<string, string>; canOperate: boolean; onDone: () => void; chantierId: string;
}) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [statut, setStatut] = useState<"terminee" | "bloquee">("terminee");
  const [saving, setSaving] = useState(false);

  const close = async () => {
    setSaving(true);
    const { error } = await supabase.from("interventions").update({
      photos_apres: photos, notes: notes.trim() || iv.notes,
      statut: statut as any, heure_fermeture: new Date().toISOString(),
    } as any).eq("id", iv.id);
    if (error) { setSaving(false); return toast.error(error.message); }
    if (iv.demande_id) {
      await supabase.from("demandes_acces").update({ statut: "terminee" as any }).eq("id", iv.demande_id);
    }
    const newLogementStatut = statut === "bloquee" ? "bloque" : "sortie_a_controler";
    await supabase.from("logements").update({ statut: newLogementStatut as any }).eq("id", iv.logement_id);
    if (iv.trousseau_id) {
      await supabase.from("mouvements_cles").insert({
        trousseau_id: iv.trousseau_id, type: "restitution" as any,
        logement_id: iv.logement_id, note: `Fin intervention ${iv.id}`,
      } as any);
    }
    setSaving(false);
    toast.success("Intervention clôturée");
    setOpen(false);
    onDone();
  };

  const durMin = Math.round((Date.now() - new Date(iv.heure_ouverture).getTime()) / 60000);

  return (
    <div className="flex items-center justify-between border rounded p-2">
      <div className="text-sm">
        <div className="font-medium">Logement {logements[iv.logement_id] ?? "—"}</div>
        <div className="text-xs text-muted-foreground">
          Ouverte {new Date(iv.heure_ouverture).toLocaleString("fr-FR")} · {durMin} min · {iv.photos_avant.length} photo(s) avant
        </div>
      </div>
      {canOperate && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><StopCircle className="size-4 mr-1" /> Clôturer</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Assistant de sortie</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <PhotoUploader paths={photos} onChange={setPhotos} chantierId={chantierId} label="Photos après intervention" />
              <div>
                <Label>Notes de sortie</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
              </div>
              <div>
                <Label>Résultat</Label>
                <Select value={statut} onValueChange={(v) => setStatut(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terminee">Terminée normalement</SelectItem>
                    <SelectItem value="bloquee"><span className="flex items-center gap-1"><AlertTriangle className="size-3" />Bloquée / anomalie</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={close} disabled={saving}>Clôturer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ---------- NON-CONFORMITÉS ---------- */
type NonConformite = {
  id: string; chantier_id: string; logement_id: string | null;
  intervention_id: string | null; trousseau_id: string | null;
  categorie: "securite" | "cle" | "logement" | "proprete" | "autre";
  gravite: "mineure" | "majeure" | "critique" | "bloquante";
  statut: "ouverte" | "en_cours" | "resolue" | "cloturee";
  titre: string; description: string | null; photos: string[];
  cree_par: string | null; resolue_par: string | null;
  resolution: string | null; resolue_at: string | null; created_at: string;
};

const NC_CAT_LABEL: Record<string, string> = {
  securite: "Sécurité", cle: "Clés", logement: "Logement", proprete: "Propreté", autre: "Autre",
};
const NC_GRAV_LABEL: Record<string, string> = {
  mineure: "Mineure", majeure: "Majeure", critique: "Critique", bloquante: "Bloquante",
};
const NC_GRAV_COLOR: Record<string, string> = {
  mineure: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  majeure: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  critique: "bg-red-500/15 text-red-700 border-red-500/30",
  bloquante: "bg-red-500/15 text-red-700 border-red-500/30",
};
const NC_STATUT_LABEL: Record<string, string> = {
  ouverte: "Ouverte", en_cours: "En cours", resolue: "Résolue", cloturee: "Clôturée",
};

function NonConformitesTab({ chantierId, userId, canManage }: {
  chantierId: string; userId: string | null; canManage: boolean;
}) {
  const [rows, setRows] = useState<NonConformite[]>([]);
  const [logements, setLogements] = useState<Record<string, string>>({});
  const [reload, setReload] = useState(0);
  const [filterStatut, setFilterStatut] = useState<string>("actives");
  const [filterCat, setFilterCat] = useState<string>("toutes");
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<NonConformite | null>(null);

  useEffect(() => {
    (async () => {
      const [nc, lg] = await Promise.all([
        supabase.from("non_conformites").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: false }),
        supabase.from("logements").select("id, numero, niveau_id, niveaux!inner(bloc_id, blocs!inner(batiment_id, batiments!inner(chantier_id)))")
          .eq("niveaux.blocs.batiments.chantier_id", chantierId),
      ]);
      setRows((nc.data ?? []) as NonConformite[]);
      const map: Record<string, string> = {};
      ((lg.data ?? []) as any[]).forEach((l) => { map[l.id] = l.numero; });
      setLogements(map);
    })();
  }, [chantierId, reload]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatut === "actives" && (r.statut === "resolue" || r.statut === "cloturee")) return false;
      if (filterStatut !== "actives" && filterStatut !== "toutes" && r.statut !== filterStatut) return false;
      if (filterCat !== "toutes" && r.categorie !== filterCat) return false;
      return true;
    });
  }, [rows, filterStatut, filterCat]);

  const changeStatut = async (id: string, statut: string) => {
    const patch: any = { statut };
    if (statut === "resolue" || statut === "cloturee") {
      patch.resolue_at = new Date().toISOString();
      patch.resolue_par = userId;
    }
    const { error } = await supabase.from("non_conformites").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    setReload((r) => r + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end justify-between">
        <div className="flex flex-wrap gap-2">
          <div>
            <Label className="text-xs">Statut</Label>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="actives">Actives (ouvertes/en cours)</SelectItem>
                <SelectItem value="toutes">Toutes</SelectItem>
                <SelectItem value="ouverte">Ouvertes</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="resolue">Résolues</SelectItem>
                <SelectItem value="cloturee">Clôturées</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Catégorie</Label>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes</SelectItem>
                {Object.entries(NC_CAT_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => setOpenCreate(true)}><Plus className="size-4 mr-1" /> Déclarer une non-conformité</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Logement</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Gravité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Aucune non-conformité.</TableCell></TableRow>
              ) : filtered.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="text-xs">{new Date(n.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{n.titre}</TableCell>
                  <TableCell className="text-sm">{n.logement_id ? logements[n.logement_id] ?? "—" : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{NC_CAT_LABEL[n.categorie]}</Badge></TableCell>
                  <TableCell><Badge className={NC_GRAV_COLOR[n.gravite]}>{NC_GRAV_LABEL[n.gravite]}</Badge></TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select value={n.statut} onValueChange={(v) => changeStatut(n.id, v)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(NC_STATUT_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{NC_STATUT_LABEL[n.statut]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{n.photos.length}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(n)}>Détail</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateNcDialog
        open={openCreate} onOpenChange={setOpenCreate}
        chantierId={chantierId} userId={userId}
        onDone={() => { setOpenCreate(false); setReload((r) => r + 1); }}
      />

      <NcDetailDialog
        nc={selected} onOpenChange={(o) => !o && setSelected(null)}
        chantierId={chantierId} userId={userId} canManage={canManage}
        logementLabel={selected?.logement_id ? logements[selected.logement_id] ?? null : null}
        onDone={() => { setSelected(null); setReload((r) => r + 1); }}
      />
    </div>
  );
}

function CreateNcDialog({ open, onOpenChange, chantierId, userId, onDone, defaultLogementId, defaultInterventionId }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  chantierId: string; userId: string | null; onDone: () => void;
  defaultLogementId?: string | null; defaultInterventionId?: string | null;
}) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState<NonConformite["categorie"]>("logement");
  const [gravite, setGravite] = useState<NonConformite["gravite"]>("mineure");
  const [logementId, setLogementId] = useState<string>(defaultLogementId ?? "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [logements, setLogements] = useState<{ id: string; numero: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("logements")
        .select("id, numero, niveau_id, niveaux!inner(bloc_id, blocs!inner(batiment_id, batiments!inner(chantier_id)))")
        .eq("niveaux.blocs.batiments.chantier_id", chantierId)
        .order("numero");
      setLogements(((data ?? []) as any[]).map((l) => ({ id: l.id, numero: l.numero })));
    })();
    setLogementId(defaultLogementId ?? "");
  }, [open, chantierId, defaultLogementId]);

  const reset = () => {
    setTitre(""); setDescription(""); setCategorie("logement");
    setGravite("mineure"); setPhotos([]); setLogementId("");
  };

  const submit = async () => {
    if (!titre.trim()) return toast.error("Titre requis");
    setSaving(true);
    const { error } = await supabase.from("non_conformites").insert({
      chantier_id: chantierId, titre: titre.trim(),
      description: description.trim() || null,
      categorie, gravite, photos,
      logement_id: logementId || null,
      intervention_id: defaultInterventionId ?? null,
      cree_par: userId,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Non-conformité déclarée");
    reset(); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Déclarer une non-conformité</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex: Serrure endommagée" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Catégorie</Label>
              <Select value={categorie} onValueChange={(v) => setCategorie(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NC_CAT_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gravité</Label>
              <Select value={gravite} onValueChange={(v) => setGravite(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NC_GRAV_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Logement concerné (optionnel)</Label>
            <Select value={logementId || "none"} onValueChange={(v) => setLogementId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {logements.map((l) => <SelectItem key={l.id} value={l.id}>{l.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} />
          </div>
          <PhotoUploader paths={photos} onChange={setPhotos} chantierId={chantierId} label="Photos" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>Déclarer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NcDetailDialog({ nc, onOpenChange, chantierId, userId, canManage, logementLabel, onDone }: {
  nc: NonConformite | null; onOpenChange: (o: boolean) => void;
  chantierId: string; userId: string | null; canManage: boolean;
  logementLabel: string | null; onDone: () => void;
}) {
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    setResolution(nc?.resolution ?? "");
    if (!nc) return;
    (async () => {
      const next: Record<string, string> = {};
      for (const p of nc.photos) {
        const { data } = await supabase.storage.from("opr-photos").createSignedUrl(p, 3600);
        if (data?.signedUrl) next[p] = data.signedUrl;
      }
      setUrls(next);
    })();
  }, [nc]);

  if (!nc) return null;

  const resoudre = async (statut: "resolue" | "cloturee") => {
    setSaving(true);
    const { error } = await supabase.from("non_conformites").update({
      statut, resolution: resolution.trim() || null,
      resolue_at: new Date().toISOString(), resolue_par: userId,
    } as any).eq("id", nc.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(statut === "resolue" ? "Non-conformité résolue" : "Non-conformité clôturée");
    onDone();
  };

  const supprimer = async () => {
    if (!confirm("Supprimer cette non-conformité ?")) return;
    const { error } = await supabase.from("non_conformites").delete().eq("id", nc.id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    onDone();
  };

  return (
    <Dialog open={!!nc} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="size-4" /> {nc.titre}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{NC_CAT_LABEL[nc.categorie]}</Badge>
            <Badge className={NC_GRAV_COLOR[nc.gravite]}>{NC_GRAV_LABEL[nc.gravite]}</Badge>
            <Badge variant="outline">{NC_STATUT_LABEL[nc.statut]}</Badge>
            {logementLabel && <Badge variant="secondary">Logement {logementLabel}</Badge>}
            <span className="text-muted-foreground">Déclarée le {new Date(nc.created_at).toLocaleString("fr-FR")}</span>
          </div>
          {nc.description && (
            <div>
              <Label className="text-xs">Description</Label>
              <div className="text-sm whitespace-pre-wrap">{nc.description}</div>
            </div>
          )}
          {nc.photos.length > 0 && (
            <div>
              <Label className="text-xs">Photos</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {nc.photos.map((p) => (
                  <a key={p} href={urls[p]} target="_blank" rel="noreferrer">
                    {urls[p] ? <img src={urls[p]} className="size-24 object-cover rounded border" alt="" /> : <div className="size-24 bg-muted rounded" />}
                  </a>
                ))}
              </div>
            </div>
          )}
          {nc.resolue_at ? (
            <div className="rounded border p-2 bg-muted/40">
              <div className="text-xs text-muted-foreground">Résolue le {new Date(nc.resolue_at).toLocaleString("fr-FR")}</div>
              {nc.resolution && <div className="text-sm mt-1 whitespace-pre-wrap">{nc.resolution}</div>}
            </div>
          ) : canManage ? (
            <div>
              <Label>Notes de résolution</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} maxLength={1000} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          {canManage && !nc.resolue_at && (
            <>
              <Button variant="outline" onClick={() => resoudre("resolue")} disabled={saving}><Check className="size-4 mr-1" /> Marquer résolue</Button>
              <Button onClick={() => resoudre("cloturee")} disabled={saving}>Clôturer</Button>
            </>
          )}
          {canManage && (
            <Button variant="ghost" onClick={supprimer} className="text-red-600"><Trash2 className="size-4 mr-1" /> Supprimer</Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
