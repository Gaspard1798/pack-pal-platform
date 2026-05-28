import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Notif = {
  id: string;
  type: string;
  titre: string;
  message: string | null;
  lien: string | null;
  lu: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, titre, message, lien, lu, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notif[]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => [n, ...prev]);
          toast(n.titre, { description: n.message ?? undefined });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = items.filter((i) => !i.lu).length;

  const markAllRead = async () => {
    const ids = items.filter((i) => !i.lu).map((i) => i.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, lu: true })));
    const { error } = await supabase.from("notifications").update({ lu: true }).in("id", ids);
    if (error) toast.error(error.message);
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, lu: true } : i)));
    await supabase.from("notifications").update({ lu: true }).eq("id", id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="size-3" /> Tout lire
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucune notification.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const inner = (
                  <div className="flex flex-col gap-0.5 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${n.lu ? "text-muted-foreground" : "font-medium"}`}>{n.titre}</p>
                        {n.message && <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="hover:bg-muted/50">
                    {n.lien ? (
                      <Link to={n.lien} onClick={() => { markRead(n.id); setOpen(false); }} className="block">
                        {inner}
                      </Link>
                    ) : (
                      <button type="button" className="block w-full text-left" onClick={() => markRead(n.id)}>
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
