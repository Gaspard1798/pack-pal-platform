import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Paperclip, Pin, Trash2, Download, MapPin, Building2, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  PRIORITE_CLASSES,
  PRIORITE_LABEL,
  DEST_LABEL,
  ZONE_LABEL,
  getIcon,
  formatDateTime,
  type Priorite,
  type DestType,
  type ZoneType,
} from "@/lib/publications";

export const Route = createFileRoute("/_authenticated/informations/$id")({
  component: DetailPage,
});

type Detail = {
  id: string;
  chantier_id: string;
  titre: string;
  description: string | null;
  resume: string | null;
  priorite: Priorite;
  zone_type: ZoneType;
  zone_libre: string | null;
  destinataires_type: DestType;
  corps_etat: string | null;
  date_debut: string;
  date_fin: string | null;
  epingle: boolean;
  auteur_id: string;
  category: { nom: string; icone: string } | null;
  auteur: { full_name: string | null; email: string | null } | null;
  entreprises: { entreprise: { nom: string } | null }[];
  pieces: { id: string; nom: string; storage_path: string; mime_type: string | null; taille: number | null }[];
};

function DetailPage() {
  const { id } = Route.useParams();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [pub, setPub] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const canEdit = roles.includes("admin") || (pub && pub.auteur_id === user?.id) || roles.includes("conducteur");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("publications")
        .select(
          "id,chantier_id,titre,description,resume,priorite,zone_type,zone_libre,destinataires_type,corps_etat,date_debut,date_fin,epingle,auteur_id,category:publication_categories(nom,icone),auteur:profiles!publications_auteur_id_fkey(full_name,email),entreprises:publication_entreprises(entreprise:entreprises(nom)),pieces:publication_pieces_jointes(id,nom,storage_path,mime_type,taille)"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setPub((data as unknown as Detail) ?? null);
      setLoading(false);

      if (data?.pieces) {
        const map: Record<string, string> = {};
        for (const p of data.pieces as any[]) {
          const { data: signed } = await supabase.storage
            .from("publication-attachments")
            .createSignedUrl(p.storage_path, 60 * 60);
          if (signed?.signedUrl) map[p.id] = signed.signedUrl;
        }
        setUrls(map);
      }
    })();
  }, [id]);

  const togglePin = async () => {
    if (!pub) return;
    const { error } = await supabase
      .from("publications")
      .update({ epingle: !pub.epingle })
      .eq("id", pub.id);
    if (error) toast.error(error.message);
    else setPub({ ...pub, epingle: !pub.epingle });
  };

  const remove = async () => {
    if (!pub) return;
    if (!confirm("Supprimer définitivement cette publication ?")) return;
    const { error } = await supabase.from("publications").delete().eq("id", pub.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Publication supprimée");
      navigate({ to: "/informations" });
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!pub) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Publication introuvable.
        </CardContent>
      </Card>
    );
  }

  const cls = PRIORITE_CLASSES[pub.priorite];
  const Icon = getIcon(pub.category?.icone);
  const isImage = (m: string | null) => (m ?? "").startsWith("image/");

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to="/informations/actives" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour
        </Link>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={togglePin}>
              <Pin className="size-4" /> {pub.epingle ? "Désépingler" : "Épingler"}
            </Button>
            <Button variant="outline" size="sm" onClick={remove}>
              <Trash2 className="size-4" /> Supprimer
            </Button>
          </div>
        )}
      </div>

      <Card className={`relative overflow-hidden ${pub.priorite === "urgent" ? `ring-1 ${cls.ring}` : ""}`}>
        <div className={`absolute inset-y-0 left-0 w-1.5 ${cls.bar}`} />
        <CardContent className="pl-5 pr-4 py-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {pub.epingle && <Pin className="size-4" />}
                  <h1 className="font-display text-xl font-semibold">{pub.titre}</h1>
                </div>
                {pub.category?.nom && <p className="text-sm text-muted-foreground">{pub.category.nom}</p>}
              </div>
            </div>
            <Badge className={cls.badge} variant="secondary">{PRIORITE_LABEL[pub.priorite]}</Badge>
          </div>

          {pub.resume && <p className="text-base text-muted-foreground">{pub.resume}</p>}

          {pub.description && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {pub.description}
            </div>
          )}

          <dl className="grid gap-3 sm:grid-cols-2 text-sm border-t pt-4">
            <MetaRow icon={Calendar} label="Publiée">
              {formatDateTime(pub.date_debut)}
            </MetaRow>
            <MetaRow icon={Calendar} label="Expire">
              {pub.date_fin ? formatDateTime(pub.date_fin) : "Pas d'expiration"}
            </MetaRow>
            <MetaRow icon={MapPin} label="Zone">
              {pub.zone_type === "chantier"
                ? ZONE_LABEL.chantier
                : `${ZONE_LABEL[pub.zone_type]}${pub.zone_libre ? " — " + pub.zone_libre : ""}`}
            </MetaRow>
            <MetaRow icon={Building2} label="Destinataires">
              {pub.destinataires_type === "entreprises" && pub.entreprises.length > 0
                ? pub.entreprises.map((e) => e.entreprise?.nom).filter(Boolean).join(", ")
                : pub.destinataires_type === "corps_etat" && pub.corps_etat
                ? `Corps d'état — ${pub.corps_etat}`
                : DEST_LABEL[pub.destinataires_type]}
            </MetaRow>
            <MetaRow icon={Building2} label="Auteur">
              {pub.auteur?.full_name || pub.auteur?.email || "—"}
            </MetaRow>
          </dl>

          {pub.pieces.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h2 className="text-sm font-medium inline-flex items-center gap-2">
                <Paperclip className="size-4" /> Pièces jointes ({pub.pieces.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {pub.pieces.map((f) => (
                  <div key={f.id} className="rounded-md border p-3 space-y-2">
                    {isImage(f.mime_type) && urls[f.id] && (
                      <a href={urls[f.id]} target="_blank" rel="noreferrer">
                        <img src={urls[f.id]} alt={f.nom} className="w-full h-40 object-cover rounded" />
                      </a>
                    )}
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{f.nom}</span>
                      {urls[f.id] && (
                        <a
                          href={urls[f.id]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
                          download
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  );
}
