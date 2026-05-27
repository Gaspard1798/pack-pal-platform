import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/planning")({
  component: () => <div className="p-6"><h1 className="font-display text-2xl font-semibold">Planning</h1><p className="mt-2 text-sm text-muted-foreground">Module à venir : vue calendrier avec détection de conflits aires/matériel.</p></div>,
});
