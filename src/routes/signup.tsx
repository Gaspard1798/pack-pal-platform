import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/use-auth";

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "6 caractères minimum").max(72),
  fullName: z.string().trim().min(1, "Nom requis").max(120),
  company: z.string().trim().max(120).optional(),
  role: z.enum(["conducteur", "prestataire", "operateur"]),
});

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Créer un compte — ChantierFlow" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", company: "", role: "prestataire" as AppRole });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && user) navigate({ to: "/dashboard", replace: true }); }, [user, loading, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.fullName, company: parsed.data.company ?? "", role: parsed.data.role },
      },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Compte créé ! Vérifiez votre email si nécessaire.");
    navigate({ to: "/dashboard", replace: true });
  };

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground"><HardHat className="h-5 w-5" /></div>
          <span className="font-display text-lg font-semibold">ChantierFlow</span>
        </Link>
        <Card className="p-6">
          <h1 className="font-display text-2xl font-semibold">Créer un compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">Rejoignez la plateforme.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Société (optionnel)</Label>
              <Input id="company" value={form.company} onChange={(e) => set("company")(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={form.role} onValueChange={(v) => set("role")(v)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conducteur">{ROLE_LABELS.conducteur}</SelectItem>
                  <SelectItem value="prestataire">{ROLE_LABELS.prestataire}</SelectItem>
                  <SelectItem value="operateur">{ROLE_LABELS.operateur}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} required autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Création..." : "Créer le compte"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà inscrit ?{" "}
            <Link to="/login" className="font-medium text-foreground hover:text-accent">Se connecter</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
