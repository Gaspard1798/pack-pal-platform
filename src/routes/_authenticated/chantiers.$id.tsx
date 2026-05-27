import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Chantier = {
  id: string; nom: string; adresse: string | null; description: string | null;
  date_debut: string | null; date_fin: string | null; actif: boolean; conducteur_id: string;
};
type Aire = { id: string; nom: string; description: string | null; capacite: number };
type Materiel = { id: string; nom: string; type: string | null; quantite: number };

export const Route = createFileRoute("/_authenticated/chantiers/$id")({
  component: ChantierDetail,
});

function ChantierDetail() {
  const { id } = Route.useParams();
  const { user, roles } = useAuth();
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);

  const isManager =
    !!chantier && (chantier.conducteur_id === user?.id || roles.includes("admin"));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chantiers").select("*").eq("id", id).maybeSingle();
    if (error) toast.error(error.message);
    setChantier((data as Chantier) ?? null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  if (!chantier) return (
    <div className="p-6 space-y-4">
      <p>Chantier introuvable ou non accessible.</p>
      <Button asChild variant="outline"><Link to="/chantiers"><ArrowLeft className="size-4" /> Retour</Link></Button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/chantiers"><ArrowLeft className="size-4" /> Chantiers</Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">{chantier.nom}</h1>
          <Badge variant={chantier.actif ? "default" : "secondary"}>
            {chantier.actif ? "Actif" : "Archivé"}
          </Badge>
        </div>
        {chantier.adresse && <p className="text-sm text-muted-foreground">{chantier.adresse}</p>}
        {chantier.description && <p className="text-sm">{chantier.description}</p>}
      </div>

      <Tabs defaultValue="aires">
        <TabsList>
          <TabsTrigger value="aires">Aires de livraison</TabsTrigger>
          <TabsTrigger value="materiel">Matériel</TabsTrigger>
        </TabsList>
        <TabsContent value="aires" className="mt-4">
          <AiresSection chantierId={id} canManage={isManager} />
        </TabsContent>
        <TabsContent value="materiel" className="mt-4">
          <MaterielsSection chantierId={id} canManage={isManager} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AiresSection({ chantierId, canManage }: { chantierId: string; canManage: boolean }) {
  const [items, setItems] = useState<Aire[]>([]);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [capacite, setCapacite] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("aires").select("*").eq("chantier_id", chantierId).order("nom");
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Aire[]);
  };
  useEffect(() => { load(); }, [chantierId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("aires").insert({
      chantier_id: chantierId, nom, description: description || null, capacite,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setNom(""); setDescription(""); setCapacite(1);
      toast.success("Aire ajoutée");
      load();
    }
  };

  const remove = async (aireId: string) => {
    const { error } = await supabase.from("aires").delete().eq("id", aireId);
    if (error) toast.error(error.message); else { toast.success("Aire supprimée"); load(); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      <Card>
        <CardHeader><CardTitle className="text-base">Aires ({items.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aucune aire définie.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-right">Capacité</TableHead>
                  {canManage && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nom}</TableCell>
                    <TableCell className="text-muted-foreground">{a.description ?? "—"}</TableCell>
                    <TableCell className="text-right">{a.capacite}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ajouter une aire</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aire-nom">Nom *</Label>
                <Input id="aire-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aire-desc">Description</Label>
                <Textarea id="aire-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aire-cap">Capacité simultanée</Label>
                <Input id="aire-cap" type="number" min={1} value={capacite}
                  onChange={(e) => setCapacite(parseInt(e.target.value) || 1)} />
              </div>
              <Button type="submit" disabled={saving || !nom} className="w-full">
                <Plus className="size-4" /> Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MaterielsSection({ chantierId, canManage }: { chantierId: string; canManage: boolean }) {
  const [items, setItems] = useState<Materiel[]>([]);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("materiels").select("*").eq("chantier_id", chantierId).order("nom");
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Materiel[]);
  };
  useEffect(() => { load(); }, [chantierId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("materiels").insert({
      chantier_id: chantierId, nom, type: type || null, quantite,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setNom(""); setType(""); setQuantite(1);
      toast.success("Matériel ajouté");
      load();
    }
  };

  const remove = async (mid: string) => {
    const { error } = await supabase.from("materiels").delete().eq("id", mid);
    if (error) toast.error(error.message); else { toast.success("Matériel supprimé"); load(); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      <Card>
        <CardHeader><CardTitle className="text-base">Matériel ({items.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aucun matériel défini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-24 text-right">Quantité</TableHead>
                  {canManage && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nom}</TableCell>
                    <TableCell className="text-muted-foreground">{m.type ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.quantite}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ajouter du matériel</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mat-nom">Nom *</Label>
                <Input id="mat-nom" value={nom} onChange={(e) => setNom(e.target.value)}
                  placeholder="Grue mobile, Chariot élévateur…" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-type">Type</Label>
                <Input id="mat-type" value={type} onChange={(e) => setType(e.target.value)}
                  placeholder="grue, chariot, nacelle…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-q">Quantité disponible</Label>
                <Input id="mat-q" type="number" min={1} value={quantite}
                  onChange={(e) => setQuantite(parseInt(e.target.value) || 1)} />
              </div>
              <Button type="submit" disabled={saving || !nom} className="w-full">
                <Plus className="size-4" /> Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
