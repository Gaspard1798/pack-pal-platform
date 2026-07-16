import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

type Profile = { id: string; email: string; full_name: string | null; company: string | null; entreprise_id: string | null };
type RoleRow = { user_id: string; role: AppRole };
type Entreprise = { id: string; nom: string };

const ALL_ROLES: AppRole[] = ["admin", "conducteur", "prestataire", "operateur"];

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, Set<AppRole>>>({});
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [authLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    const [p, r, e] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, company, entreprise_id").order("email"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("entreprises").select("id, nom").order("nom"),
    ]);
    if (p.error) toast.error(p.error.message);
    if (r.error) toast.error(r.error.message);
    setProfiles((p.data ?? []) as Profile[]);
    setEntreprises((e.data ?? []) as Entreprise[]);
    const map: Record<string, Set<AppRole>> = {};
    for (const row of (r.data ?? []) as RoleRow[]) {
      if (!map[row.user_id]) map[row.user_id] = new Set();
      map[row.user_id].add(row.role);
    }
    setRolesMap(map);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const setEntreprise = async (userId: string, entrepriseId: string | null) => {
    const { error } = await supabase.from("profiles").update({ entreprise_id: entrepriseId }).eq("id", userId);
    if (error) return toast.error(error.message);
    setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, entreprise_id: entrepriseId } : p));
    toast.success("Entreprise mise à jour");
  };

  const toggleRole = async (userId: string, role: AppRole, checked: boolean) => {
    if (checked) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete()
        .eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    }
    toast.success("Rôle mis à jour");
    setRolesMap((prev) => {
      const next = { ...prev };
      const set = new Set(next[userId] ?? []);
      if (checked) set.add(role); else set.delete(role);
      next[userId] = set;
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      p.email.toLowerCase().includes(q) ||
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.company ?? "").toLowerCase().includes(q),
    );
  }, [profiles, search]);

  if (authLoading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-md">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            <CardTitle className="text-base">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cette page est réservée aux administrateurs.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          Gérer les rôles attribués à chaque utilisateur.
        </p>
      </div>

      <Input
        placeholder="Rechercher par email, nom ou société…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} utilisateur(s)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aucun utilisateur.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Rôles actuels</TableHead>
                  {ALL_ROLES.map((r) => (
                    <TableHead key={r} className="text-center text-xs">
                      {ROLE_LABELS[r]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userRoles = rolesMap[p.id] ?? new Set<AppRole>();
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.entreprise_id ?? "none"}
                          onValueChange={(v) => setEntreprise(p.id, v === "none" ? null : v)}
                        >
                          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucune</SelectItem>
                            {entreprises.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {[...userRoles].length === 0 ? (
                            <span className="text-xs text-muted-foreground">Aucun</span>
                          ) : (
                            [...userRoles].map((r) => (
                              <Badge key={r} variant="secondary" className="text-xs">
                                {ROLE_LABELS[r]}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      {ALL_ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          <Checkbox
                            checked={userRoles.has(r)}
                            onCheckedChange={(c) => toggleRole(p.id, r, !!c)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={load} disabled={loading}>
          Rafraîchir
        </Button>
      </div>
    </div>
  );
}
