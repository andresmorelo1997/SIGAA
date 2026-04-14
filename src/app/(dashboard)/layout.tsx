"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  HomeIcon,
  AcademicCapIcon,
  ClockIcon,
  BookOpenIcon,
  UserGroupIcon,
  BanknotesIcon,
  BellAlertIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  CalendarIcon,
  PresentationChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface UserInfo {
  id: number;
  username: string;
  nombre: string;
  rol: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation Structure — Reorganized for intuitive grouping          */
/* ------------------------------------------------------------------ */
const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: HomeIcon },
    ],
  },
  {
    title: "Datos y Carga",
    items: [
      { label: "Carga Académica", href: "/carga-academica", icon: AcademicCapIcon },
      { label: "Importaciones", href: "/historial-importaciones", icon: DocumentArrowDownIcon },
    ],
  },
  {
    title: "Gestión Académica",
    items: [
      { label: "Docentes", href: "/docentes", icon: UserGroupIcon },
      { label: "Programas", href: "/programas", icon: Squares2X2Icon },
      { label: "Plan de Estudios", href: "/plan-estudios", icon: BookOpenIcon },
      { label: "Escalafón", href: "/escalafon", icon: ChartBarIcon },
    ],
  },
  {
    title: "Nómina y Procesos",
    items: [
      { label: "Prenómina", href: "/prenomina", icon: BanknotesIcon },
      { label: "Cortes Prenómina", href: "/configuracion-cortes", icon: CalendarIcon },
      { label: "Novedades", href: "/novedades", icon: BellAlertIcon },
    ],
  },
  {
    title: "Reportes y Documentos",
    items: [
      { label: "Reportes", href: "/reportes", icon: PresentationChartBarIcon },
      { label: "Documentos", href: "/documentos", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Configuración",
    items: [
      { label: "Usuarios", href: "/usuarios", icon: UsersIcon },
      { label: "Calendario", href: "/calendario", icon: CalendarDaysIcon },
      { label: "Parámetros", href: "/parametros", icon: Cog6ToothIcon },
    ],
  },
];

const allNavItems = navSections.flatMap((s) => s.items);

function getPageTitle(pathname: string): string {
  const item = allNavItems.find((item) => item.href === pathname);
  return item?.label || "SIGAA";
}

/* ------------------------------------------------------------------ */
/*  Layout Component                                                   */
/* ------------------------------------------------------------------ */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/login");
      }
    }
    fetchUser();
  }, [router]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // logout anyway
    }
    router.push("/login");
  }, [router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const pageTitle = getPageTitle(pathname);

  /* ---------------------------------------------------------------- */
  /*  Sidebar Content                                                  */
  /* ---------------------------------------------------------------- */
  const sidebarContent = (
    <>
      {/* Logo Header — crop to the university crest + text block only.
           Matches Horilla's oh-sidebar__company block: thin bottom border,
           white background so the logo is clean. */}
      <div className="flex h-24 items-center justify-center px-3 shrink-0 bg-white border-b border-[hsl(213,22%,88%)] relative overflow-hidden">
        <div
          className="relative h-20 w-full overflow-hidden flex items-center"
        >
          <img
            src="/logos/unisinu-logo.png"
            alt="Universidad del Sinú"
            // Height fills the container; width auto preserves aspect ratio.
            // With height=80px, the left block is ~180px wide — the sidebar
            // crop naturally hides the right medallions.
            className="h-20 w-auto max-w-none select-none pointer-events-none"
            draggable={false}
          />
        </div>
        {/* Close button (mobile) */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 hover:text-zinc-900 bg-white/80"
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>

      {/* (no extra divider — header already has a bottom border) */}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section) => {
          // Filter "Usuarios" entry — visible only to admins.
          const items = section.items.filter((it) => {
            if (it.href === '/usuarios') return user?.rol === 'admin';
            return true;
          });
          if (items.length === 0) return null;
          return (
          <div key={section.title || "_root"}>
            {section.title && (
              <div className="mb-2 px-3 flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                  {section.title}
                </h3>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>
            )}
            <ul role="list" className="space-y-0.5">
              {items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "group relative flex items-center gap-x-3 px-3 py-2 text-[13px] transition-all duration-100",
                        isActive
                          ? "bg-white text-[#212121] font-semibold shadow-sm border border-[hsl(213,22%,90%)]"
                          : "text-zinc-600 font-medium hover:bg-white hover:text-[#212121]"
                      )}
                      style={{ borderRadius: '6px' }}
                    >
                      {/* Active indicator: Horilla coral accent */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm bg-[#E54F38]"
                        />
                      )}
                      <Icon
                        className={clsx(
                          "size-[18px] shrink-0 transition-colors",
                          isActive
                            ? "text-[#E54F38]"
                            : "text-zinc-400 group-hover:text-[#212121]"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </nav>

      {/* User footer — Horilla oh-sidebar__user block */}
      <div className="shrink-0 border-t border-[hsl(213,22%,88%)] bg-white p-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-zinc-200">
              <span className="text-xs font-bold text-white">
                {user.nombre
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate leading-tight">
                {user.nombre}
              </p>
              <p className="text-xs text-zinc-500 truncate leading-tight">{user.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
              title="Cerrar Sesión"
            >
              <ArrowRightStartOnRectangleIcon className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="size-8 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-24" />
              <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded w-16" />
            </div>
          </div>
        )}
      </div>
    </>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(213,22%,97%)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/20 backdrop-blur-[2px] z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Horilla style: soft gray background with white card items */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-[260px] bg-[hsl(213,22%,95%)] border-r border-[hsl(213,22%,85%)] flex flex-col",
          "transform transition-transform duration-200 ease-out",
          "lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — thin white strip with breadcrumb */}
        <header className="bg-white border-b border-[hsl(213,22%,90%)] h-14 flex items-center gap-4 px-4 sm:px-6 shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <Bars3Icon className="size-5" />
          </button>

          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {pageTitle}
            </h1>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-xs text-zinc-500 font-medium">
                {user.nombre}
              </span>
            )}
          </div>
        </header>

        {/* Page content — scrollable area. Uses flex column so children
             with h-full can size themselves and keep pagination sticky. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="p-4 sm:p-6 lg:px-8 lg:py-6 min-w-0 flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
