import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin/users")({
  component: () => <div className="p-6"><h1 className="font-display text-2xl font-semibold">Utilisateurs</h1><p className="mt-2 text-sm text-muted-foreground">Module à venir : gestion globale des utilisateurs et des rôles.</p></div>,
});
