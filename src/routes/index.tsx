import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Truck, Calendar, Wrench, ShieldCheck, ArrowRight, HardHat } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChantierFlow — La logistique de chantier sans conflit" },
      { name: "description", content: "Planifiez livraisons et extractions, organisez aires et matériel, suivez le terrain en temps réel." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <HardHat className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">ChantierFlow</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <Link to="/signup">
              <Button>Créer un compte</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Gestion logistique de chantier
          </div>
          <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            La logistique de votre chantier,{" "}
            <span className="text-accent">sans conflit.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Planifiez les flux entrants et sortants, attribuez aires et matériel,
            détectez les conflits avant qu'ils n'arrivent — et gardez la main sur le terrain.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Commencer <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">J'ai déjà un compte</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-7xl px-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} ChantierFlow
        </div>
      </footer>
    </div>
  );
}

const features = [
  { icon: Calendar, title: "Planification", desc: "Calendrier des créneaux de livraison et d'extraction, vue par aire et par matériel." },
  { icon: Truck, title: "Demandes prestataires", desc: "Vos prestataires réservent leurs créneaux ; vous validez, modifiez ou refusez." },
  { icon: Wrench, title: "Matériel & aires", desc: "Configurez aires et engins, et évitez les doubles affectations automatiquement." },
  { icon: ShieldCheck, title: "Compte-rendu terrain", desc: "Check-in à l'arrivée, non-conformités tracées, historique consultable." },
];
