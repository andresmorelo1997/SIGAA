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
      { label: "Profesores x Asig.", href: "/profesores-asignatura", icon: UsersIcon },
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
      {/* Logo Header */}
      <div className="flex h-16 items-center gap-3 px-6 shrink-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 shrink-0">
          <svg className="size-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.25C17.17 23.15 21 18.25 21 13V7l-9-5zm0 2.18l7 3.89v5.93c0 4.12-2.95 7.97-7 8.93-4.05-.96-7-4.81-7-8.93V8.07l7-3.89z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-950 dark:text-white">SIGAA</p>
          <p className="text-xs text-zinc-500 truncate">Universidad del Sinú</p>
        </div>
        {/* Close button (mobile) */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden -mr-1 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-zinc-950/5 dark:border-white/5" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
        {navSections.map((section, sIdx) => (
          <div key={section.title || "_root"}>
            {section.title && (
              <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {section.title}
              </h3>
            )}
            <ul role="list" className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "group flex items-center gap-x-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-zinc-950/5 text-zinc-950 dark:bg-white/10 dark:text-white"
                          : "text-zinc-600 hover:bg-zinc-950/[0.03] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                      )}
                    >
                      <Icon
                        className={clsx(
                          "size-[18px] shrink-0 transition-colors",
                          isActive
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-zinc-950/5 dark:border-white/5 p-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-800">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
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
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/20 backdrop-blur-[2px] z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-[260px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col",
          "transform transition-transform duration-200 ease-out",
          "lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 h-14 flex items-center gap-4 px-4 sm:px-6 shrink-0">
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
