import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Paperclip, X, Pin } from "lucide-react";
import type { Priorite, DestType, ZoneType } from "@/lib/publications";

export const Route = createFileRoute("/_authenticated/informations/nouvelle")({
  head: () => ({ meta: [{ title: "Nouvelle publication — Fluxop" }] }),
  component: NouvellePage,
});

function NouvellePage() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const canPublish = roles.includes("admin") || roles.includes("conducteur");

  const [chantiers, setChantiers] = useState<{ id: string; nom: string }[]>([]);
  const [cats, setCats] = useState<{ id: string; nom: string }[]>([]);
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);

  const [chantierId, setChantierId] = useState("");
  const [titre, setTitre] = useState("");
  const [resume, setResume] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priorite, setPriorite] = useState<Priorite>("information");
  const [zoneType, setZoneType] = useState<ZoneType>("chantier");
  const [zoneLibre, setZoneLibre] = useState("");
  const [destType, setDestType] = useState<DestType>("toutes");
  const [corpsEtat, setCorpsEtat] = useState("");
  const [selectedEntreprises, setSelectedEntreprises] = useState<string[]>([]);
  const [dateDebut, setDateDebut] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [dateFin, setDateFin] = useState<string>("");
  const [epingle, setEpingle] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: ch }, { data: c }, { data: ent }] = await Promise.all([
        supabase.from("chantiers").select("id,nom").eq("actif", true).order("nom"),
        supabase.from("publication_categories").select("id,nom").order("ordre"),
        supabase.from("entreprises").select("id,nom").order("nom"),
      ]);
      setChantiers(ch ?? []);
      setCats(c ?? []);
      setEntreprises(ent ?? []);
      if (ch && ch.length === 1) setChantierId(ch[0].id);
    })();
  }, []);

  const toggleEntreprise = (id: string) => {
    setSelectedEntreprises((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chantierId || !titre) return;
    setSaving(true);
    try {
      const { data: pub, error } = await supabase
        .from("publications")
        .insert({
          chantier_id: chantierId,
          auteur_id: user.id,
          titre,
          resume: resume || null,
          description: description || null,
          category_id: categoryId || null,
          priorite,
          zone_type: zoneType,
          zone_libre: zoneType === "zone_libre" ? (zoneLibre || null) : null,
          destinataires_type: destType,
          corps_etat: destType === "corps_etat" ? (corpsEtat || null) : null,
          date_debut: new Date(dateDebut).toISOString(),
          date_fin: dateFin ? new Date(dateFin).toISOString() : null,
          epingle,
        })
        .select("id")
        .single();
      if (error || !pub) throw error ?? new Error("Erreur");

      if (destType === "entreprises" && selectedEntreprises.length > 0) {
        const { error: e2 } = await supabase.from("publication_entreprises").insert(
          selectedEntreprises.map((id) => ({ publication_id: pub.id, entreprise_id: id }))
        );
        if (e2) throw e2;
      }

      if (files.length > 0) {
        for (const f of files) {
          const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${chantierId}/${pub.id}/${Date.now()}_${safe}`;
          const { error: upErr } = await supabase.storage
            .from("publication-attachments")
            .upload(path, f, { contentType: f.type, upsert: false });
          if (upErr) throw upErr;
          const { error: pjErr } = await supabase.from("publication_pieces_jointes").insert({
            publication_id: pub.id,
            nom: f.name,
            storage_path: path,
            mime_type: f.type || null,
            taille: f.size,
          });
          if (pjErr) throw pjErr;
        }
      }

      toast.success("Publication créée");
      navigate({ to: "/informations/$id", params: { id: pub.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  if (!canPublish) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Vous n'avez pas les droits pour créer une publication.
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Chantier *</Label>
              <Select value={chantierId} onValueChange={setChantierId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {chantiers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume">Résumé</Label>
            <Input id="resume" value={resume} onChange={(e) => setResume(e.target.value)} maxLength={300} placeholder="Quelques lignes qui apparaîtront sur la carte" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description détaillée</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={8} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Priorité</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {(["information", "important", "urgent"] as Priorite[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorite(p)}
                className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                  priorite === p
                    ? p === "urgent"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : p === "important"
                      ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-primary bg-primary/10"
                    : "hover:bg-accent"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Zone concernée</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={zoneType} onValueChange={(v) => setZoneType(v as ZoneType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="chantier">Tout le chantier</SelectItem>
              <SelectItem value="batiment">Un bâtiment</SelectItem>
              <SelectItem value="bloc">Un bloc</SelectItem>
              <SelectItem value="niveau">Un niveau</SelectItem>
              <SelectItem value="zone_libre">Zone spécifique</SelectItem>
            </SelectContent>
          </Select>
          {zoneType !== "chantier" && (
            <Input
              value={zoneLibre}
              onChange={(e) => setZoneLibre(e.target.value)}
              placeholder="Précisez la zone (ex. Bâtiment A, R+2, Bloc Nord…)"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Destinataires</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={destType} onValueChange={(v) => setDestType(v as DestType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les entreprises</SelectItem>
              <SelectItem value="entreprises">Entreprises sélectionnées</SelectItem>
              <SelectItem value="corps_etat">Un corps d'état</SelectItem>
              <SelectItem value="fournisseurs">Fournisseurs</SelectItem>
              <SelectItem value="transporteurs">Transporteurs</SelectItem>
              <SelectItem value="equipes_internes">Équipes internes</SelectItem>
            </SelectContent>
          </Select>
          {destType === "corps_etat" && (
            <Input value={corpsEtat} onChange={(e) => setCorpsEtat(e.target.value)} placeholder="Corps d'état (ex. Gros œuvre)" />
          )}
          {destType === "entreprises" && (
            <div className="grid gap-2 md:grid-cols-2 max-h-64 overflow-auto rounded-md border p-3">
              {entreprises.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">Aucune entreprise enregistrée.</p>
              ) : entreprises.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEntreprises.includes(e.id)}
                    onChange={() => toggleEntreprise(e.id)}
                    className="size-4"
                  />
                  {e.nom}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Période de validité</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Début</Label>
            <Input type="datetime-local" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fin (facultatif)</Label>
            <Input type="datetime-local" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            <p className="text-xs text-muted-foreground">Après cette date, la publication rejoint les archives.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Options</CardTitle></CardHeader>
        <CardContent>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={epingle} onChange={(e) => setEpingle(e.target.checked)} className="size-4" />
            <Pin className="size-4" /> Épingler cette publication en haut du module
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pièces jointes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm hover:bg-accent w-full justify-center">
            <Paperclip className="size-4" />
            <span>Ajouter des fichiers (PDF, images, plans, Word, Excel…)</span>
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
          {files.length > 0 && (
            <ul className="space-y-1 text-sm">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="truncate">{f.name} <span className="text-xs text-muted-foreground">({Math.round(f.size / 1024)} Ko)</span></span>
                  <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/informations" })}>
          Annuler
        </Button>
        <Button type="submit" disabled={saving || !titre || !chantierId}>
          {saving ? "Publication…" : "Publier"}
        </Button>
      </div>
    </form>
  );
}
