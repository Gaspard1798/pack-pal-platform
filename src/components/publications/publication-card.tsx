import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Pin, MapPin, Building2 } from "lucide-react";
import {
  PRIORITE_CLASSES,
  PRIORITE_LABEL,
  getIcon,
  formatDateTime,
  type Priorite,
} from "@/lib/publications";

export type PublicationCardData = {
  id: string;
  titre: string;
  resume: string | null;
  priorite: Priorite;
  epingle: boolean;
  date_debut: string;
  date_fin: string | null;
  zone_type: string;
  zone_libre: string | null;
  auteur_nom?: string | null;
  category?: { nom: string; icone: string } | null;
  entreprises_noms?: string[];
  destinataires_type: string;
  pieces_count?: number;
};

export function PublicationCard({ p }: { p: PublicationCardData }) {
  const cls = PRIORITE_CLASSES[p.priorite];
  const Icon = getIcon(p.category?.icone);

  return (
    <Link
      to="/informations/$id"
      params={{ id: p.id }}
      className="block"
    >
      <Card
        className={`relative overflow-hidden transition-colors hover:border-primary ${
          p.priorite === "urgent" ? `ring-1 ${cls.ring}` : ""
        }`}
      >
        <div className={`absolute inset-y-0 left-0 w-1.5 ${cls.bar}`} />
        <CardContent className="pl-5 pr-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {p.epingle && (
                    <Pin className="size-3.5 text-accent-foreground" />
                  )}
                  <h3 className="font-medium leading-tight truncate">
                    {p.titre}
                  </h3>
                </div>
                {p.category?.nom && (
                  <p className="text-xs text-muted-foreground">
                    {p.category.nom}
                  </p>
                )}
              </div>
            </div>
            <Badge className={cls.badge} variant="secondary">
              {PRIORITE_LABEL[p.priorite]}
            </Badge>
          </div>

          {p.resume && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {p.resume}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDateTime(p.date_debut)}</span>
            {p.auteur_nom && <span>· {p.auteur_nom}</span>}
            {(p.zone_libre || p.zone_type !== "chantier") && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {p.zone_libre || p.zone_type}
              </span>
            )}
            {p.destinataires_type !== "toutes" &&
              p.entreprises_noms &&
              p.entreprises_noms.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3" />
                  {p.entreprises_noms.slice(0, 2).join(", ")}
                  {p.entreprises_noms.length > 2 &&
                    ` +${p.entreprises_noms.length - 2}`}
                </span>
              )}
            {!!p.pieces_count && p.pieces_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="size-3" />
                {p.pieces_count}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
