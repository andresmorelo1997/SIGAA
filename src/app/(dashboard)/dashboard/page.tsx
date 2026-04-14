'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatCard, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface RecentImport {
  id: number;
  filename: string;
  file_type: string;
  ciclo_lectivo: string;
  grado: string;
  records_inserted: number;
  records_updated: number;
  status: string;
  created_at: string;
}

interface DashboardStats {
  total_clases: number;
  total_docentes: number;
  total_programas: number;
  total_horas: number;
  por_grado: { label: string; total: number }[];
  por_estado: { label: string; total: number }[];
  recentImports?: RecentImport[];
  novedadesPendientes?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200 ${className ?? ''}`} />;
}

function BarChart({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  // Horilla palette: coral highlight + dark neutrals.
  const colors: Record<string, string> = {
    PREG: 'bg-[#E54F38]',
    POSG: 'bg-[#212121]',
    ESP: 'bg-zinc-500',
    MSTR: 'bg-zinc-700',
    DOCT: 'bg-zinc-600',
    TCN: 'bg-zinc-400',
  };

  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800">{d.label}</span>
            <span className="text-sm font-bold text-zinc-900 tabular-nums">
              {d.total.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colors[d.label] ?? 'bg-zinc-500'}`}
              style={{ width: `${(d.total / max) * 100}%`, minWidth: d.total > 0 ? '6px' : '0' }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400">Sin datos disponibles</p>
      )}
    </div>
  );
}

function QuickActionCard({
  label,
  description,
  href,
  icon,
}: {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-lg border border-[hsl(213,22%,90%)] bg-white p-4 transition-all duration-150 hover:shadow-sm hover:border-[#E54F38]/40 block"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex items-center justify-center size-10 rounded-md bg-[hsl(8,77%,95%)] text-[#E54F38] group-hover:bg-[#E54F38] group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#212121] group-hover:text-[#E54F38] transition-colors">
            {label}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function ImportStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    pending: 'bg-amber-100 text-amber-700 ring-amber-200',
    processing: 'bg-blue-100 text-blue-700 ring-blue-200',
    failed: 'bg-red-100 text-red-700 ring-red-200',
    error: 'bg-red-100 text-red-700 ring-red-200',
  };
  const cls = map[status.toLowerCase()] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200';
  const label: Record<string, string> = {
    completed: 'Completado',
    success: 'Completado',
    pending: 'Pendiente',
    processing: 'En proceso',
    failed: 'Error',
    error: 'Error',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label[status.toLowerCase()] ?? status}
    </span>
  );
}

function truncateFilename(name: string, maxLen = 30): string {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf('.');
  if (ext > 0) {
    const extension = name.slice(ext);
    const base = name.slice(0, maxLen - extension.length - 3);
    return `${base}...${extension}`;
  }
  return `${name.slice(0, maxLen - 3)}...`;
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                    */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Error al cargar datos del dashboard');
        const data: DashboardStats = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const novedadesPendientes = stats?.novedadesPendientes ?? 0;
  const recentImports = stats?.recentImports ?? [];

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      <PageHeader
        title="Panel de Control"
        description={dateStr}
        color="secondary"
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 12 2.25 21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        }
      />

      {/* Novedades pendientes banner */}
      {!loading && novedadesPendientes > 0 && (
        <Link
          href="/novedades"
          className="mb-6 flex items-center gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 text-amber-900 transition-all duration-200 hover:shadow-md"
        >
          <div className="shrink-0 flex items-center justify-center size-10 rounded-lg bg-amber-500 text-white shadow-sm">
            <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="flex-1 text-sm font-semibold">
            Hay {novedadesPendientes} novedad{novedadesPendientes === 1 ? '' : 'es'} pendiente{novedadesPendientes === 1 ? '' : 's'} de revisión
          </span>
          <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 h-[120px]">
              <SkeletonBox className="h-3 w-20 mb-3" />
              <SkeletonBox className="h-8 w-16" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total Clases"
            value={stats.total_clases.toLocaleString('es-CO')}
            color="primary"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            }
          />
          <StatCard
            label="Docentes"
            value={stats.total_docentes.toLocaleString('es-CO')}
            color="neutral"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            }
          />
          <StatCard
            label="Total Horas"
            value={stats.total_horas.toLocaleString('es-CO')}
            color="info"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
          <StatCard
            label="Programas"
            value={stats.total_programas.toLocaleString('es-CO')}
            color="neutral"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            }
          />
          <StatCard
            label="Novedades"
            hint="pendientes de revisión"
            value={novedadesPendientes.toLocaleString('es-CO')}
            color={novedadesPendientes > 0 ? 'warning' : 'success'}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* Charts + Quick Actions */}
      {loading ? (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2 space-y-4">
            <SkeletonBox className="h-6 w-44" />
            <SkeletonBox className="h-6 w-full" />
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
            <SkeletonBox className="h-6 w-36" />
            <SkeletonBox className="h-20 w-full" />
          </div>
        </div>
      ) : stats ? (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Distribution by grado */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-zinc-900">Distribución por Grado</h2>
              <span className="text-xs text-zinc-500">
                Total: {stats.por_grado.reduce((s, g) => s + g.total, 0).toLocaleString('es-CO')}
              </span>
            </div>
            <BarChart data={stats.por_grado} />
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-zinc-900">Acciones Rápidas</h2>
            <div className="space-y-3">
              <QuickActionCard
                label="Importar Carga"
                description="Subir archivos Excel (US_PROG, LC_PROG...)"
                href="/historial-importaciones"
                color="primary"
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                }
              />
              <QuickActionCard
                label="Generar Prenómina"
                description="Calcular horas por docente"
                href="/prenomina"
                color="emerald"
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375M3.75 18.75h.375c.621 0 1.125-.504 1.125-1.125V5.625m0 0h4.875c.621 0 1.125.504 1.125 1.125v12.75h-6V5.625Z" />
                  </svg>
                }
              />
              <QuickActionCard
                label="Ver Reportes"
                description="SNIES, dedicación, horas..."
                href="/reportes"
                color="neutral"
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent imports */}
      {stats && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Importaciones Recientes</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Últimos archivos procesados por el sistema</p>
            </div>
            <Link
              href="/historial-importaciones"
              className="inline-flex items-center gap-1 text-sm font-medium text-unisinu-700 hover:text-unisinu-800"
            >
              Ver todo
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {recentImports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Archivo</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Ciclo</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600">Registros</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recentImports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="whitespace-nowrap px-6 py-3 font-medium text-zinc-900" title={imp.filename ?? '-'}>
                        {truncateFilename(imp.filename ?? '-')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span className="inline-flex items-center rounded-md bg-unisinu-50 px-2 py-0.5 text-xs font-semibold text-unisinu-800 ring-1 ring-inset ring-unisinu-200">
                          {imp.file_type ?? '-'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-600">{imp.ciclo_lectivo ?? '-'}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-bold text-zinc-900 tabular-nums">
                        {imp.records_inserted != null ? imp.records_inserted.toLocaleString('es-CO') : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <ImportStatusBadge status={imp.status ?? '-'} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-500 text-xs">
                        {imp.created_at ? formatDateTime(imp.created_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-zinc-500">No hay importaciones recientes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
