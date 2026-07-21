import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Info } from "lucide-react";
import { PRIORITE_CLASSES, PRIORITE_LABEL, getIcon, type Priorite } from "@/lib/publications";

export const Route = createFileRoute("/_authenticated/informations/parametres")({
  component: ParametresPage,
});

type Cat = { id: string; nom: string; icone: string; ordre: number; is_default: boolean; chantier_id: string | null };

function ParametresPage() {
  const { roles } = useAuth();
  const canEdit = roles.includes("admin") || roles.includes("conducteur");
  const [cats, setCats] = useState<Cat[]>([]);
  const [nom, setNom] = useState("");
  const [icone, setIcone] = useState("Info");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("publication_categories")
      .select("*")
      .order("ordre");
    setCats((data ?? []) as Cat[]);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!nom.trim()) return;
    setSaving(true);
    const maxOrdre = Math.max(0, ...cats.map((c) => c.ordre));
    const { error } = await supabase
      .from("publication_categories")
      .insert({ nom, icone: icone || "Info", ordre: maxOrdre + 10, is_default: false });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Catégorie ajoutée");
      setNom("");
      setIcone("Info");
      load();
    }
  };

  const remove = async (c: Cat) => {
    if (c.is_default) return;
    if (!confirm(`Supprimer la catégorie "${c.nom}" ?`)) return;
    const { error } = await supabase.from("publication_categories").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Catégories</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <div className="space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nouvelle catégorie" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icône (lucide)</Label>
                <Input value={icone} onChange={(e) => setIcone(e.target.value)} placeholder="Info" />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={add} disabled={saving || !nom.trim()}>
                  <Plus className="size-4" /> Ajouter
                </Button>
              </div>
            </div>
          )}
          <ul className="space-y-1">
            {cats.map((c) => {
              const Ic = getIcon(c.icone);
              return (
                <li key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Ic className="size-4 shrink-0" />
                    <span className="truncate">{c.nom}</span>
                    {c.is_default && <span className="text-xs text-muted-foreground">(défaut)</span>}
                  </div>
                  {canEdit && !c.is_default && (
                    <button onClick={() => remove(c)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Info className="size-3" /> Les catégories par défaut ne peuvent pas être supprimées.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Couleurs des priorités</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(["information", "important", "urgent"] as Priorite[]).map((p) => {
            const cls = PRIORITE_CLASSES[p];
            return (
              <div key={p} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <span className={`inline-block h-4 w-4 rounded-full ${cls.bar}`} />
                <span className="flex-1">{PRIORITE_LABEL[p]}</span>
                <span className={`rounded-md px-2 py-0.5 text-xs ${cls.badge}`}>Aperçu</span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-2">
            Les couleurs sémantiques sont définies dans le design system de Fluxop pour rester cohérentes avec le reste de l'application.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Modèles &amp; durées par défaut</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Les modèles de publication et les durées de validité par défaut par chantier seront configurables ici prochainement.
        </CardContent>
      </Card>
    </div>
  );
}
