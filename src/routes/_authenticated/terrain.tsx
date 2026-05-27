import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/terrain")({
  component: () => <div className="p-6"><h1 className="font-display text-2xl font-semibold">Terrain</h1><p className="mt-2 text-sm text-muted-foreground">Module à venir : check-in arrivée, non-conformités, compte-rendu.</p></div>,
});
