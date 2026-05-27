import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MapPin } from "lucide-react";

type Chantier = {
  id: string;
  nom: string;
  adresse: string | null;
  description: string | null;
  date_debut: string | null;
  date_fin: string | null;
  actif: boolean;
  conducteur_id: string;
};

export const Route = createFileRoute("/_authenticated/chantiers")({
  component: ChantiersPage,
});

function ChantiersPage() {
  const { user, roles } = useAuth();
  const [items, setItems] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const isConducteur = roles.includes("conducteur") || roles.includes("admin");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chantiers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Chantier[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Chantiers</h1>
          <p className="text-sm text-muted-foreground">Gestion des chantiers, aires de livraison et matériel.</p>
        </div>
        {isConducteur && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Nouveau chantier</Button>
            </DialogTrigger>
            <NewChantierDialog
              userId={user!.id}
              onCreated={() => { setOpen(false); load(); }}
            />
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun chantier {isConducteur ? "— créez-en un pour démarrer." : "accessible pour le moment."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link key={c.id} to="/chantiers/$id" params={{ id: c.id }} className="block">
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{c.nom}</CardTitle>
                    <Badge variant={c.actif ? "default" : "secondary"}>
                      {c.actif ? "Actif" : "Archivé"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {c.adresse && (
                    <div className="flex items-start gap-2">
                      <MapPin className="size-4 mt-0.5 shrink-0" />
                      <span>{c.adresse}</span>
                    </div>
                  )}
                  {c.description && <p className="line-clamp-2">{c.description}</p>}
                  {(c.date_debut || c.date_fin) && (
                    <p className="text-xs">
                      {c.date_debut ?? "?"} → {c.date_fin ?? "?"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewChantierDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [description, setDescription] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("chantiers").insert({
      nom,
      adresse: adresse || null,
      description: description || null,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      conducteur_id: userId,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Chantier créé");
      onCreated();
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nouveau chantier</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nom">Nom *</Label>
          <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="dd">Début</Label>
            <Input id="dd" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="df">Fin</Label>
            <Input id="df" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !nom}>
            {saving ? "Création…" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
