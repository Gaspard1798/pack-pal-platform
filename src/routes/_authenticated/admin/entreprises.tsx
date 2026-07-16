import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, ShieldAlert, Download } from "lucide-react";

type Entreprise = {
  id: string;
  nom: string;
  siret: string | null;
  adresse: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/entreprises")({
  head: () => ({ meta: [{ title: "Entreprises — Fluxop" }] }),
  component: EntreprisesPage,
});

function EntreprisesPage() {
  const { roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const canManage = roles.includes("admin") || roles.includes("conducteur");

  const [items, setItems] = useState<Entreprise[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Entreprise | null>(null);

  useEffect(() => {
    if (!authLoading && !canManage) navigate({ to: "/dashboard", replace: true });
  }, [authLoading, canManage, navigate]);

  const load = async () => {
    setLoading(true);
    const [e, p] = await Promise.all([
      supabase.from("entreprises").select("*").order("nom"),
      supabase.from("profiles").select("entreprise_id"),
    ]);
    if (e.error) toast.error(e.error.message);
    setItems((e.data ?? []) as Entreprise[]);
    const c: Record<string, number> = {};
    for (const row of (p.data ?? []) as { entreprise_id: string | null }[]) {
      if (row.entreprise_id) c[row.entreprise_id] = (c[row.entreprise_id] ?? 0) + 1;
    }
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => { if (canManage) load(); }, [canManage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.nom.toLowerCase().includes(q) ||
      (i.siret ?? "").toLowerCase().includes(q) ||
      (i.contact_email ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette entreprise ? Les utilisateurs rattachés seront détachés.")) return;
    const { error } = await supabase.from("entreprises").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entreprise supprimée");
    load();
  };

  const exportCsv = () => {
    const header = ["nom", "siret", "adresse", "contact_email", "contact_phone", "nb_utilisateurs"];
    const lines = [header.join(";")];
    for (const e of filtered) {
      lines.push([
        e.nom, e.siret ?? "", e.adresse ?? "", e.contact_email ?? "",
        e.contact_phone ?? "", String(counts[e.id] ?? 0),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entreprises-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  if (!canManage) {
    return (
      <div className="p-6 max-w-md">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            <CardTitle className="text-base">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Réservé aux administrateurs et conducteurs de travaux.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Entreprises</h1>
          <p className="text-sm text-muted-foreground">
            Rattachez vos prestataires à une entreprise pour filtrer et exporter les données.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Nouvelle entreprise</Button>
            </DialogTrigger>
            <EntrepriseDialog onDone={() => { setOpenNew(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <Input
        placeholder="Rechercher par nom, SIRET, email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardHeader><CardTitle className="text-base">{filtered.length} entreprise(s)</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Building2 className="mx-auto mb-2 size-8 opacity-50" />
              Aucune entreprise. Créez la première.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nom}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.siret || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{e.contact_email || "—"}</div>
                      <div className="text-xs text-muted-foreground">{e.contact_phone || ""}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{counts[e.id] ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                          <Pencil className="size-4" />
                        </Button>
                        {roles.includes("admin") && (
                          <Button size="sm" variant="ghost" onClick={() => remove(e.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <EntrepriseDialog
            entreprise={editing}
            onDone={() => { setEditing(null); load(); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function EntrepriseDialog({ entreprise, onDone }: { entreprise?: Entreprise; onDone: () => void }) {
  const [nom, setNom] = useState(entreprise?.nom ?? "");
  const [siret, setSiret] = useState(entreprise?.siret ?? "");
  const [adresse, setAdresse] = useState(entreprise?.adresse ?? "");
  const [email, setEmail] = useState(entreprise?.contact_email ?? "");
  const [phone, setPhone] = useState(entreprise?.contact_phone ?? "");
  const [notes, setNotes] = useState(entreprise?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    const payload = {
      nom: nom.trim(),
      siret: siret.trim() || null,
      adresse: adresse.trim() || null,
      contact_email: email.trim() || null,
      contact_phone: phone.trim() || null,
      notes: notes.trim() || null,
    };
    const { error } = entreprise
      ? await supabase.from("entreprises").update(payload).eq("id", entreprise.id)
      : await supabase.from("entreprises").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(entreprise ? "Entreprise mise à jour" : "Entreprise créée");
    onDone();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{entreprise ? "Modifier l'entreprise" : "Nouvelle entreprise"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nom">Nom *</Label>
          <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={120} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email de contact</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} maxLength={250} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving || !nom.trim()}>
            {saving ? "Enregistrement…" : entreprise ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
