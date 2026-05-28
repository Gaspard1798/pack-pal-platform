import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Mon profil — ChantierFlow" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, roles } = useAuth();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setFullName(data.full_name ?? "");
        setCompany(data.company ?? "");
        setPhone(data.phone ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, company: company || null, phone: phone || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour");
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Mon profil</h1>
        <p className="text-sm text-muted-foreground">Gérez vos informations personnelles.</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>

              <div className="space-y-2">
                <Label>Rôles</Label>
                <div className="flex flex-wrap gap-1.5">
                  {roles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Aucun</span>
                  ) : (
                    roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r]}</Badge>)
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Société</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
