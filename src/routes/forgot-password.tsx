import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { HardHat } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({ email: z.string().trim().email("Email invalide").max(255) });

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Mot de passe oublié — Fluxop" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Email envoyé");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <HardHat className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">Fluxop</span>
        </Link>
        <Card className="p-6">
          <h1 className="font-display text-2xl font-semibold">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </p>
          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm">
                Si un compte existe pour <strong>{email}</strong>, un email vient d'être envoyé avec un lien pour définir un nouveau mot de passe. Pensez à vérifier les indésirables.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-foreground hover:text-accent">Retour à la connexion</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
