import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Settings2, LogOut, ShieldCheck, PanelLeftClose, X, Layers } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const { isGestorSaude, isAdmin } = useRoles();
  const navigate = useNavigate();
  const { toggleSidebar, isMobile, setOpenMobile } = useSidebar();

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, show: true },
    { title: "Grupos", url: "/grupos", icon: Layers, show: true },
    { title: "Gestão", url: "/gestao", icon: Settings2, show: isGestorSaude },
    { title: "Administração", url: "/admin", icon: ShieldCheck, show: isAdmin },
  ].filter((i) => i.show);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* Collapsed: small H mark so the rail isn't blank. Hidden when expanded. */}
          <div className="hidden h-8 w-8 shrink-0 rounded-md bg-primary items-center justify-center text-primary-foreground font-bold group-data-[collapsible=icon]:flex">
            H
          </div>
          {/* Expanded: full HEALTHBIT wordmark. Hidden when collapsed. */}
          <Link
            to="/"
            className="group-data-[collapsible=icon]:hidden flex-1 min-w-0 flex items-center"
            aria-label="HEALTHBIT — voltar ao dashboard"
          >
            <img
              src="/logo.webp"
              alt="HEALTHBIT — uma empresa RDsaúde"
              className="max-h-12 w-auto object-contain"
            />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 group-data-[collapsible=icon]:hidden"
            onClick={() => (isMobile ? setOpenMobile(false) : toggleSidebar())}
            aria-label={isMobile ? "Fechar menu" : "Recolher menu"}
          >
            {isMobile ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={path === it.url} tooltip={it.title}>
                    <Link to={it.url}>
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={() => signOut().then(() => navigate({ to: "/login" }))}
            >
              <LogOut className="h-4 w-4" />
              <span className="truncate">{user?.email ?? "Sair"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
