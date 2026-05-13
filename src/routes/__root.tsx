import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Página não encontrada.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComp({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HEALTHBIT — Painel de Obesidade" },
      {
        name: "description",
        content: "Painel executivo de acompanhamento de IMC e Peso — programa HEALTHBIT / RDsaúde.",
      },
      { property: "og:title", content: "HEALTHBIT — Painel de Obesidade" },
      { name: "twitter:title", content: "HEALTHBIT — Painel de Obesidade" },
      {
        property: "og:description",
        content: "Painel executivo de acompanhamento de IMC e Peso — programa HEALTHBIT / RDsaúde.",
      },
      {
        name: "twitter:description",
        content: "Painel executivo de acompanhamento de IMC e Peso — programa HEALTHBIT / RDsaúde.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/01737725-5fab-4835-bdb3-efab88aebfc9/id-preview-7c5a7c0b--90d37ab6-9799-4b34-b22f-d759c0734cf7.lovable.app-1778516970997.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/01737725-5fab-4835-bdb3-efab88aebfc9/id-preview-7c5a7c0b--90d37ab6-9799-4b34-b22f-d759c0734cf7.lovable.app-1778516970997.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/webp", href: "/logo.webp" },
    ],
  }),
  shellComponent: ({ children }: { children: React.ReactNode }) => (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  ),
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComp,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Shell />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const SIDEBAR_STORAGE_KEY = "sidebar:open";

function Shell() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const v = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v !== null) setOpen(v === "1");
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "1" : "0");
  }, [hydrated, open]);

  if (path === "/login") return <Outlet />;
  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-10 flex items-center border-b px-2 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger aria-label="Alternar menu" />
          </div>
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
