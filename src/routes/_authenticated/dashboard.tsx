import { createFileRoute } from "@tanstack/react-router";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { HardHat, Truck, Calendar, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — ChantierFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, roles } = useAuth();
  const primary = roles[0];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Bonjour</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email}
          {primary && <> · {ROLE_LABELS[primary]}</>}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <k.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold">—</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.hint}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg font-semibold">Prochaines étapes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La structure de la plateforme est en place. Les modules suivants arrivent :
          gestion des chantiers, formulaire de demande de créneau, planning avec détection
          de conflits, et vue terrain pour le compte-rendu des venues.
        </p>
      </Card>
    </div>
  );
}

const kpis = [
  { label: "Chantiers actifs", hint: "Vos chantiers en cours", icon: HardHat },
  { label: "Demandes en attente", hint: "À valider", icon: Truck },
  { label: "Créneaux aujourd'hui", hint: "Sur tous chantiers", icon: Calendar },
  { label: "Non-conformités", hint: "7 derniers jours", icon: ClipboardCheck },
];
