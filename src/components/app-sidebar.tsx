import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, HardHat, Truck, Calendar, ClipboardCheck, Users, LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

type Item = { title: string; url: string; icon: typeof LayoutDashboard; roles?: AppRole[] };

const items: Item[] = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Chantiers", url: "/chantiers", icon: HardHat, roles: ["conducteur", "admin", "operateur"] },
  { title: "Demandes", url: "/demandes", icon: Truck, roles: ["prestataire", "conducteur", "admin"] },
  { title: "Planning", url: "/planning", icon: Calendar, roles: ["conducteur", "admin"] },
  { title: "Terrain", url: "/terrain", icon: ClipboardCheck, roles: ["operateur", "conducteur", "admin"] },
  { title: "Utilisateurs", url: "/admin/users", icon: Users, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, roles, signOut } = useAuth();

  const visible = items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r)));
  const primaryRole = roles[0];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <HardHat className="h-4 w-4" />
          </div>
          {!collapsed && <span className="font-display font-semibold text-sidebar-foreground">ChantierFlow</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url || path.startsWith(item.url + "/")}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-1">
            <div className="truncate text-xs font-medium text-sidebar-foreground">{user?.email}</div>
            {primaryRole && <div className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[primaryRole]}</div>}
          </div>
        )}
        <Button variant="ghost" size="sm" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
