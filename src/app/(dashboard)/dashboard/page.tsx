'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
/*  Icon components (colored dots for simplicity)                    */
/* ------------------------------------------------------------------ */
function ColorDot({ color }: { color: string }) {
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center"
      style={{ backgroundColor: color }}
    >
      <div className="h-5 w-5 rounded-full bg-white/30" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                  */
/* ------------------------------------------------------------------ */
function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-200 ${className ?? ''}`}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-950/5 bg-white p-6">
      <div className="flex items-start gap-4">
        <SkeletonBox className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-7 w-24" />
          <SkeletonBox className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                         */
/* ------------------------------------------------------------------ */
function StatCard({
  icon,
  value,
  label,
  accentColor,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-950/5 bg-white p-6 transition-all duration-200 hover:border-zinc-950/10 hover:shadow-sm">
      <div className="flex items-start gap-4">
        <div style={{ color: accentColor }}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-3xl font-semibold text-zinc-950">
            {value.toLocaleString('es-CO')}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar Chart (pure CSS)                                              */
/* ------------------------------------------------------------------ */
function BarChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const colors: Record<string, string> = {
    PREG: '#3b82f6',
    POSG: '#8b5cf6',
    ESP: '#10b981',
  };

  return (
    <div className="space-y-5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900">{d.label}</span>
            <span className="text-sm font-semibold text-zinc-600">{d.total}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(d.total / max) * 100}%`,
                backgroundColor: colors[d.label] ?? '#6b7280',
                minWidth: d.total > 0 ? '4px' : '0',
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Sin datos disponibles
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Action Card                                                 */
/* ------------------------------------------------------------------ */
function QuickActionCard({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <div className="group rounded-xl border border-zinc-950/5 bg-white p-5 transition-all duration-200 hover:border-indigo-200 hover:shadow-sm">
        <div className="mb-3 flex items-center justify-center text-indigo-600">
          {icon}
        </div>
        <p className="text-sm font-medium text-zinc-900 text-center group-hover:text-indigo-600 transition-colors">
          {label}
        </p>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Import status badge                                               */
/* ------------------------------------------------------------------ */
function ImportStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    success: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
  };
  const cls = map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  File type badge                                                   */
/* ------------------------------------------------------------------ */
function FileTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    xlsx: 'bg-emerald-50 text-emerald-700',
    xls: 'bg-emerald-50 text-emerald-700',
    csv: 'bg-blue-50 text-blue-700',
  };
  const cls = map[type.toLowerCase()] ?? 'bg-zinc-100 text-zinc-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${cls}`}>
      {type}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Truncate filename helper                                          */
/* ------------------------------------------------------------------ */
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

  /* ---------- date string ---------- */
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const novedadesPendientes = stats?.novedadesPendientes ?? 0;
  const recentImports = stats?.recentImports ?? [];

  /* ---------- error state ---------- */
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
    <div className="min-h-screen bg-zinc-50">
      {/* Header section */}
      <div className="border-b border-zinc-950/5 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold text-zinc-950">
              Panel de Control
            </h1>
            <p className="text-sm capitalize text-zinc-500">{dateStr}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Novedades pendientes banner */}
        {!loading && novedadesPendientes > 0 && (
          <Link
            href="/novedades"
            className="mb-8 flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 transition-all duration-200 hover:bg-amber-100 hover:border-amber-300"
          >
            <svg
              className="h-5 w-5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="flex-1 text-sm font-medium">
              Hay {novedadesPendientes} novedad{novedadesPendientes === 1 ? '' : 'es'} pendiente{novedadesPendientes === 1 ? '' : 's'} de revisión
            </span>
            <svg
              className="h-5 w-5 shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* Stat cards */}
        {loading ? (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : stats ? (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747 0-6.002-4.5-10.747-10-10.747z" />
                </svg>
              }
              value={stats.total_clases}
              label="Total Clases"
              accentColor="#3b82f6"
            />
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3.914a3 3 0 01-2.974-3.558 9.999 9.999 0 015.5-8.5M15 21l6.713-3.213A9.001 9.001 0 0020.5 9.75c0-2.333-.816-4.477-2.167-6.147" />
                </svg>
              }
              value={stats.total_docentes}
              label="Total Docentes"
              accentColor="#06b6d4"
            />
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              value={stats.total_horas}
              label="Total Horas"
              accentColor="#10b981"
            />
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              value={stats.total_programas}
              label="Total Programas"
              accentColor="#8b5cf6"
            />
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              }
              value={novedadesPendientes}
              label="Novedades Pendientes"
              accentColor={novedadesPendientes > 0 ? '#f59e0b' : '#9ca3af'}
            />
          </div>
        ) : null}

      {/* Charts and Quick Actions Section */}
      {loading ? (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-950/5 bg-white p-6 lg:col-span-2 space-y-4">
            <SkeletonBox className="h-6 w-44" />
            <SkeletonBox className="h-6 w-full" />
            <SkeletonBox className="h-6 w-full" />
            <SkeletonBox className="h-6 w-full" />
          </div>
          <div className="rounded-xl border border-zinc-950/5 bg-white p-6 space-y-4">
            <SkeletonBox className="h-6 w-36" />
            <SkeletonBox className="h-20 w-full" />
            <SkeletonBox className="h-20 w-full" />
          </div>
        </div>
      ) : stats ? (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Distribution by grado */}
          <div className="rounded-xl border border-zinc-950/5 bg-white p-6 lg:col-span-2">
            <h2 className="mb-6 text-base font-semibold text-zinc-950">
              Distribución por Grado
            </h2>
            <BarChart data={stats.por_grado} />
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-zinc-950/5 bg-white p-6">
            <h2 className="mb-5 text-base font-semibold text-zinc-950">
              Acciones Rápidas
            </h2>
            <div className="space-y-3">
              <QuickActionCard
                label="Importar Carga"
                href="/importaciones"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
              />
              <QuickActionCard
                label="Generar Prenómina"
                href="/prenomina"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <QuickActionCard
                label="Ver Reportes"
                href="/reportes"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent imports table */}
      {loading ? (
        <div className="rounded-xl border border-zinc-950/5 bg-white overflow-hidden space-y-4 p-6">
          <SkeletonBox className="h-6 w-52" />
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      ) : stats ? (
        <div className="rounded-xl border border-zinc-950/5 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-950/5 px-6 py-5">
            <h2 className="text-base font-semibold text-zinc-950">
              Importaciones Recientes
            </h2>
            <Link
              href="/historial-importaciones"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Ver todo
              <svg
                className="ml-1 inline-block h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {recentImports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-950/5 bg-zinc-50/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Archivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Ciclo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Registros
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-950/5">
                  {recentImports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-zinc-50/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-3 font-medium text-zinc-900" title={imp.filename ?? '-'}>
                        {truncateFilename(imp.filename ?? '-')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <FileTypeBadge type={imp.file_type ?? '-'} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-600">
                        {imp.ciclo_lectivo ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-semibold text-zinc-900">
                        {imp.records_inserted != null ? imp.records_inserted.toLocaleString('es-CO') : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <ImportStatusBadge status={imp.status ?? '-'} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-500">
                        {imp.created_at
                          ? new Date(imp.created_at).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">No hay importaciones recientes</p>
            </div>
          )}
        </div>
      ) : null}
      </div>
    </div>
  );
}
