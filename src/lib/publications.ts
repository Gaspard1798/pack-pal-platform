import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Priorite = "information" | "important" | "urgent";
export type DestType =
  | "toutes"
  | "entreprises"
  | "corps_etat"
  | "fournisseurs"
  | "transporteurs"
  | "equipes_internes";
export type ZoneType = "chantier" | "batiment" | "bloc" | "niveau" | "zone_libre";

export const PRIORITE_LABEL: Record<Priorite, string> = {
  information: "Information",
  important: "Important",
  urgent: "Urgent",
};

export const PRIORITE_CLASSES: Record<
  Priorite,
  { bar: string; badge: string; ring: string }
> = {
  information: {
    bar: "bg-muted-foreground/40",
    badge: "bg-muted text-muted-foreground",
    ring: "ring-border",
  },
  important: {
    bar: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/40",
  },
  urgent: {
    bar: "bg-destructive",
    badge: "bg-destructive/15 text-destructive",
    ring: "ring-destructive/50",
  },
};

export const DEST_LABEL: Record<DestType, string> = {
  toutes: "Toutes les entreprises",
  entreprises: "Entreprises sélectionnées",
  corps_etat: "Corps d'état",
  fournisseurs: "Fournisseurs",
  transporteurs: "Transporteurs",
  equipes_internes: "Équipes internes",
};

export const ZONE_LABEL: Record<ZoneType, string> = {
  chantier: "Tout le chantier",
  batiment: "Bâtiment",
  bloc: "Bloc",
  niveau: "Niveau",
  zone_libre: "Zone spécifique",
};

export function getIcon(name: string | null | undefined): LucideIcon {
  const key = (name ?? "Info") as keyof typeof Icons;
  const Ic = (Icons as unknown as Record<string, LucideIcon>)[key];
  return Ic ?? Icons.Info;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isExpired(date_fin: string | null): boolean {
  if (!date_fin) return false;
  return new Date(date_fin).getTime() < Date.now();
}
