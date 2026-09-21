import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Building2, ChevronDown, HeartHandshake, Menu, ShieldCheck, Store, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

function SessionLink({ type, id, name }: { type: "client" | "supplier"; id: string; name?: string }) {
  const to = type === "client" ? "/clients/$id/dashboard" : "/suppliers/$id/dashboard";
  return (
    <Link
      to={to}
      params={{ id }}
      className="flex flex-col rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
      onClick={() => {
        window.localStorage.setItem(`matchleaf_${type}_id`, id);
      }}
    >
      <span className="flex items-center gap-2 font-medium">
        {type === "client" ? <Building2 className="size-4 text-primary" /> : <Store className="size-4 text-primary" />}
        {type === "client" ? "Client dashboard" : "Supplier dashboard"}
      </span>
      {name && <span className="mt-0.5 truncate text-xs text-muted-foreground">{name}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [ids, setIds] = useState<{
    client: string | undefined;
    supplier: string | undefined;
    clientName: string | undefined;
    supplierName: string | undefined;
  }>({ client: undefined, supplier: undefined, clientName: undefined, supplierName: undefined });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const health = useQuery({ queryKey: ["health"], queryFn: api.getHealth, refetchInterval: 60000, retry: 1 });
  const clientsQuery = useQuery({ queryKey: ["clients", "workspace-list"], queryFn: () => api.getClients(), staleTime: 30000, retry: 1 });
  const suppliersQuery = useQuery({ queryKey: ["suppliers", "workspace-list"], queryFn: () => api.getSuppliers(), staleTime: 30000, retry: 1 });

  const clientList = (clientsQuery.data?.items || []) as Record<string, unknown>[];
  const supplierList = (suppliersQuery.data?.items || []) as Record<string, unknown>[];

  useEffect(() => {
    const storedClientId = window.localStorage.getItem("matchleaf_client_id");
    const storedSupplierId = window.localStorage.getItem("matchleaf_supplier_id");

    let validClient = clientList.find((c) => String(c.id) === storedClientId);
    if (!validClient && clientList.length > 0) {
      // Heal localStorage: Stale ID replaced with first active client in DB
      validClient = clientList[0];
      window.localStorage.setItem("matchleaf_client_id", String(validClient.id));
    }

    let validSupplier = supplierList.find((s) => String(s.id) === storedSupplierId);
    if (!validSupplier && supplierList.length > 0) {
      // Heal localStorage: Stale ID replaced with first active supplier in DB
      validSupplier = supplierList[0];
      window.localStorage.setItem("matchleaf_supplier_id", String(validSupplier.id));
    }

    setIds({
      client: validClient ? String(validClient.id) : undefined,
      supplier: validSupplier ? String(validSupplier.id) : undefined,
      clientName: validClient ? String(validClient.company_name ?? "") : undefined,
      supplierName: validSupplier ? String(validSupplier.supplier_name ?? "") : undefined,
    });
    setMobileOpen(false);
    setSessionOpen(false);
  }, [clientList, supplierList, pathname]);

  const links = (
    <>
      <Link to="/" activeOptions={{ exact: true }} className="nav-link" activeProps={{ className: "nav-link-active" }}>Overview</Link>
      <Link to="/clients/new" className="nav-link" activeProps={{ className: "nav-link-active" }}>For clients</Link>
      <Link to="/suppliers/new" className="nav-link" activeProps={{ className: "nav-link-active" }}>For suppliers</Link>
      <Link to="/admin" className="nav-link" activeProps={{ className: "nav-link-active" }}>Admin</Link>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-6">
          <Link to="/" className="mr-auto flex items-center gap-2 font-display text-xl font-semibold text-foreground">
            <span className="grid size-9 place-items-center rounded-lg border border-primary/40 bg-primary text-primary-foreground"><HeartHandshake className="size-5" /></span>
            Matchleaf
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">{links}</nav>
          <div className="relative hidden sm:block">
            <Button variant="outline" onClick={() => setSessionOpen((open) => !open)} className="bg-card">
              My workspace <ChevronDown className="size-3.5" />
            </Button>
            {sessionOpen && (
              <div className="absolute right-0 top-11 w-64 rounded-lg border border-border bg-popover p-2 shadow-soft">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Workspaces</p>
                {ids.client ? (
                  <SessionLink type="client" id={ids.client} name={ids.clientName} />
                ) : (
                  <Link to="/clients/new" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
                    <Building2 className="size-4" /> Create client profile
                  </Link>
                )}
                {ids.supplier ? (
                  <SessionLink type="supplier" id={ids.supplier} name={ids.supplierName} />
                ) : (
                  <Link to="/suppliers/new" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
                    <Store className="size-4" /> Create supplier profile
                  </Link>
                )}
                <div className="my-1.5 border-t border-border" />
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <Link to="/clients/new" className="rounded px-3 py-1.5 hover:bg-accent hover:text-foreground">
                    + New client requirement
                  </Link>
                  <Link to="/suppliers/new" className="rounded px-3 py-1.5 hover:bg-accent hover:text-foreground">
                    + New supplier offering
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
            <span className={`size-2 rounded-full ${health.data?.status === "ok" ? "bg-success" : "bg-warning"}`} />
            {health.isLoading ? "Checking systems" : health.data?.status === "ok" ? "All systems running" : "Service degraded"}
          </div>
          <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Toggle navigation" onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {mobileOpen && (
          <nav className="flex flex-col border-t border-border px-4 py-3 lg:hidden">
            {links}
            <div className="my-2 border-t border-border pt-2">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">My Workspace</p>
              {ids.client && <SessionLink type="client" id={ids.client} name={ids.clientName} />}
              {ids.supplier && <SessionLink type="supplier" id={ids.supplier} name={ids.supplierName} />}
            </div>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Thoughtful matches, clearer decisions.</span>
          <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${health.data?.status === "ok" ? "bg-success" : "bg-warning"}`} />{health.data?.status === "ok" ? "All systems running" : "System status unavailable"}</span>
        </div>
      </footer>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const count = useQuery({ queryKey: ["notifications", "unread"], queryFn: api.getUnreadCount, retry: 1 });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.getNotifications, enabled: open, retry: 1 });
  const unread = count.data?.unread_count ?? count.data?.count ?? 0;

  useEffect(() => {
    if (!open || !notifications.data) return;
    const unreadItems = notifications.data.items.filter((item) => !(item.is_read ?? item.read));
    if (unreadItems.length === 0) return;
    void Promise.all(unreadItems.map((item) => api.markNotificationRead(item.id))).then(() => count.refetch());
  }, [open, notifications.data]);

  function toggle() { setOpen((value) => !value); }

  return (
    <div className="relative">
      <Button variant="outline" size="icon" aria-label="Notifications" onClick={toggle} className="relative bg-card">
        <Bell />{unread > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-rose-foreground">{unread}</span>}
      </Button>
      {open && <div className="absolute right-0 top-11 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-3 shadow-soft">
        <p className="mb-2 font-display font-semibold">Notifications</p>
        {notifications.isLoading && <div className="space-y-2"><div className="skeleton h-14" /><div className="skeleton h-14" /></div>}
        {notifications.isError && <p className="error-banner">{notifications.error.message}</p>}
        {notifications.data?.items.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">Nothing new—your desk is tidy.</p>}
        <div className="max-h-72 space-y-1 overflow-auto">{notifications.data?.items.map((item) => <div key={item.id} className="rounded-md bg-muted p-3 text-sm"><strong className="block">{item.title || "Match update"}</strong><span className="text-muted-foreground">{item.message}</span></div>)}</div>
      </div>}
    </div>
  );
}