import { useState, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Ticket,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Minha Loja", href: "/dashboard/store", icon: Store },
  { label: "Cardápio", href: "/dashboard/menu", icon: UtensilsCrossed },
  { label: "Pedidos", href: "/dashboard/orders", icon: ShoppingBag, roles: ["store_owner", "delivery_driver"] },
  { label: "Entregas", href: "/dashboard/deliveries", icon: Truck, roles: ["store_owner", "delivery_driver"] },
  { label: "Entregadores", href: "/dashboard/drivers", icon: Users, roles: ["store_owner"] },
  { label: "Cupons", href: "/dashboard/coupons", icon: Ticket, roles: ["store_owner"] },
  { label: "Planos", href: "/dashboard/plans", icon: Crown, roles: ["store_owner"] },
  { label: "Empresas", href: "/dashboard/companies", icon: Store, roles: ["super_admin"] },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, hasRole, roles } = useAuth();

  // Enable real-time order notifications
  useOrderNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => hasRole(role as any));
  });

  const userInitials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Store className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">MenuPro</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {roles[0] === "super_admin"
                    ? "Super Admin"
                    : roles[0] === "store_owner"
                      ? "Lojista"
                      : roles[0] === "delivery_driver"
                        ? "Entregador"
                        : "Usuário"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">{userInitials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
