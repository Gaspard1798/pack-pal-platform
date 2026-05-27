import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/chantiers")({
  component: () => <div className="p-6"><h1 className="font-display text-2xl font-semibold">Chantiers</h1><p className="mt-2 text-sm text-muted-foreground">Module à venir : création et configuration des chantiers (aires, matériel).</p></div>,
});
