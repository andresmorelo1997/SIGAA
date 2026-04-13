'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast, ToastContainer } from '@/components/ui/toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Corte {
  num_corte: number;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion?: string;
}

interface SemanaSantaConfig {
  fecha_inicio: string;
  fecha_fin: string;
}

interface Excepcion {
  id?: number;
  programa: string;
  motivo: string;
}

interface DropdownOption {
  value: string;
  label: string;
}

const GRADOS = [
  { id: 'PREG', label: 'PREG', numCortes: 4 },
  { id: 'PRE2', label: 'PRE2', numCortes: 4 },
  { id: 'POSG', label: 'POSG', numCortes: 6 },
  { id: 'MSTR', label: 'MSTR', numCortes: 6 },
  { id: 'DOCT', label: 'DOCT', numCortes: 6 },
  { id: 'ESP', label: 'ESP', numCortes: 6 },
];

const CORTE_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ConfiguracionCortesPage() {
  const [periodo, setPeriodo] = useState('2026-1');
  const [periodoOptions, setPeriodoOptions] = useState<DropdownOption[]>([]);
  const [activeGrado, setActiveGrado] = useState('PREG');
  const [cortesByGrado, setCortesByGrado] = useState<Record<string, Corte[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Semana Santa
  const [ssConfig, setSsConfig] = useState<SemanaSantaConfig>({ fecha_inicio: '', fecha_fin: '' });
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [savingSemana, setSavingSemana] = useState(false);
  const [newExcPrograma, setNewExcPrograma] = useState('');
  const [newExcMotivo, setNewExcMotivo] = useState('');

  // Copy modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromGrado, setCopyFromGrado] = useState('');

  const { toasts, addToast, removeToast } = useToast();

  /* ---- Get current grado config ---- */
  const currentGrado = GRADOS.find((g) => g.id === activeGrado)!;
  const currentCortes = cortesByGrado[activeGrado] || [];

  /* ---- Fetch periodos from /api/ciclos ---- */
  useEffect(() => {
    async function fetchPeriodos() {
      try {
        const res = await fetch('/api/ciclos');
        if (!res.ok) return;
        const json = await res.json();
        if (json.periodos && json.periodos.length > 0) {
          setPeriodoOptions(json.periodos);
          setPeriodo(json.periodos[0].value);
        }
      } catch {
        /* silent */
      }
    }
    fetchPeriodos();
  }, []);

  /* ---- Fetch cortes ---- */
  const fetchCortes = useCallback(async () => {
    if (!periodo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cortes-prenomina?periodo=${encodeURIComponent(periodo)}`);
      if (!res.ok) throw new Error('Error al cargar cortes');
      const json = await res.json();
      const grouped: Record<string, Corte[]> = {};

      for (const g of GRADOS) {
        grouped[g.id] = [];
        for (let i = 1; i <= g.numCortes; i++) {
          grouped[g.id].push({
            num_corte: i,
            fecha_inicio: '',
            fecha_fin: '',
            descripcion: `Corte ${ROMAN[i - 1]} ${g.id}`,
          });
        }
      }

      if (json.grouped) {
        for (const [grado, rows] of Object.entries(json.grouped)) {
          if (grouped[grado]) {
            for (const row of rows as Array<{ num_corte: number; fecha_inicio: string; fecha_fin: string; descripcion?: string }>) {
              const idx = grouped[grado].findIndex((c) => c.num_corte === row.num_corte);
              if (idx >= 0) {
                grouped[grado][idx] = {
                  num_corte: row.num_corte,
                  fecha_inicio: row.fecha_inicio || '',
                  fecha_fin: row.fecha_fin || '',
                  descripcion: row.descripcion,
                };
              }
            }
          }
        }
      }

      setCortesByGrado(grouped);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [periodo, addToast]);

  /* ---- Fetch Semana Santa ---- */
  const fetchSemanaSanta = useCallback(async () => {
    if (!periodo) return;
    try {
      const res = await fetch(`/api/semana-santa?periodo=${encodeURIComponent(periodo)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.config) {
        setSsConfig({
          fecha_inicio: json.config.fecha_inicio || '',
          fecha_fin: json.config.fecha_fin || '',
        });
      } else {
        setSsConfig({ fecha_inicio: '', fecha_fin: '' });
      }
      setExcepciones(json.excepciones || []);
    } catch {
      /* silent */
    }
  }, [periodo]);

  useEffect(() => {
    fetchCortes();
    fetchSemanaSanta();
  }, [fetchCortes, fetchSemanaSanta]);

  /* ---- Update a corte field ---- */
  function updateCorte(numCorte: number, field: 'fecha_inicio' | 'fecha_fin', value: string) {
    setCortesByGrado((prev) => {
      const updated = { ...prev };
      const list = [...(updated[activeGrado] || [])];
      const idx = list.findIndex((c) => c.num_corte === numCorte);
      if (idx >= 0) {
        list[idx] = { ...list[idx], [field]: value };
      }
      updated[activeGrado] = list;
      return updated;
    });
  }

  /* ---- Save cortes for current grado ---- */
  async function handleSaveCortes() {
    setSaving(true);
    try {
      const res = await fetch('/api/cortes-prenomina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo,
          grado: activeGrado,
          cortes: currentCortes,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      addToast('success', `Cortes de ${activeGrado} guardados correctamente`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  /* ---- Save Semana Santa ---- */
  async function handleSaveSemanaSanta() {
    setSavingSemana(true);
    try {
      const res = await fetch('/api/semana-santa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo,
          fecha_inicio: ssConfig.fecha_inicio,
          fecha_fin: ssConfig.fecha_fin,
          excepciones: excepciones.map((e) => ({ programa: e.programa, motivo: e.motivo })),
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      addToast('success', 'Semana Santa actualizada correctamente');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error al guardar Semana Santa');
    } finally {
      setSavingSemana(false);
    }
  }

  /* ---- Add exception ---- */
  function handleAddExcepcion() {
    if (!newExcPrograma.trim()) return;
    setExcepciones((prev) => [...prev, { programa: newExcPrograma.trim(), motivo: newExcMotivo.trim() }]);
    setNewExcPrograma('');
    setNewExcMotivo('');
  }

  /* ---- Remove exception ---- */
  function handleRemoveExcepcion(index: number) {
    setExcepciones((prev) => prev.filter((_, i) => i !== index));
  }

  /* ---- Copy from another grado ---- */
  function handleCopy() {
    if (!copyFromGrado || copyFromGrado === activeGrado) return;
    const source = cortesByGrado[copyFromGrado] || [];
    const targetNumCortes = currentGrado.numCortes;

    const copied: Corte[] = [];
    for (let i = 1; i <= targetNumCortes; i++) {
      const src = source.find((c) => c.num_corte === i);
      copied.push({
        num_corte: i,
        fecha_inicio: src?.fecha_inicio || '',
        fecha_fin: src?.fecha_fin || '',
        descripcion: `Corte ${ROMAN[i - 1]} ${activeGrado}`,
      });
    }

    setCortesByGrado((prev) => ({
      ...prev,
      [activeGrado]: copied,
    }));
    setShowCopyModal(false);
    addToast('info', `Cortes copiados de ${copyFromGrado} a ${activeGrado}`);
  }

  /* ---- Timeline visualization ---- */
  function renderTimeline() {
    const cortes = currentCortes.filter((c) => c.fecha_inicio && c.fecha_fin);
    if (cortes.length === 0) return null;

    const allDates = cortes.flatMap((c) => [
      new Date(c.fecha_inicio).getTime(),
      new Date(c.fecha_fin).getTime(),
    ]).filter((d) => !isNaN(d));

    if (allDates.length === 0) return null;

    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const range = maxDate - minDate || 1;

    return (
      <div className="mt-4">
        <h3 className="text-xs font-semibold text-zinc-600 mb-2 uppercase tracking-wide">{"L\u00ednea de Tiempo"}</h3>
        <div className="relative bg-zinc-100 rounded-lg h-10 overflow-hidden">
          {cortes.map((c, i) => {
            const start = new Date(c.fecha_inicio).getTime();
            const end = new Date(c.fecha_fin).getTime();
            if (isNaN(start) || isNaN(end)) return null;
            const left = ((start - minDate) / range) * 100;
            const width = Math.max(((end - start) / range) * 100, 2);
            return (
              <div
                key={c.num_corte}
                className={`absolute top-1 bottom-1 rounded ${CORTE_COLORS[i % CORTE_COLORS.length]} opacity-80 flex items-center justify-center`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`Corte ${ROMAN[c.num_corte - 1]}: ${c.fecha_inicio} - ${c.fecha_fin}`}
              >
                <span className="text-[10px] font-bold text-white truncate px-1">
                  {ROMAN[c.num_corte - 1]}
                </span>
              </div>
            );
          })}
          {/* Semana Santa overlay */}
          {ssConfig.fecha_inicio && ssConfig.fecha_fin && (() => {
            const ssStart = new Date(ssConfig.fecha_inicio).getTime();
            const ssEnd = new Date(ssConfig.fecha_fin).getTime();
            if (isNaN(ssStart) || isNaN(ssEnd) || ssStart < minDate || ssEnd > maxDate) return null;
            const left = ((ssStart - minDate) / range) * 100;
            const width = Math.max(((ssEnd - ssStart) / range) * 100, 1);
            return (
              <div
                className="absolute top-0 bottom-0 bg-red-500/30 border-l border-r border-red-400"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`Semana Santa: ${ssConfig.fecha_inicio} - ${ssConfig.fecha_fin}`}
              />
            );
          })()}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-zinc-600">
            {new Date(minDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
          </span>
          <span className="text-[10px] text-zinc-600">
            {new Date(maxDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
            {"Configuraci\u00f3n de Cortes y Semana Santa"}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {"Administrar fechas de cortes por grado y per\u00edodo"}
          </p>
        </div>
        {/* Period selector */}
        <div className="w-48">
          <Select
            label="Periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            options={periodoOptions.length > 0 ? periodoOptions : [{ value: '2026-1', label: '2026-1' }]}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Semana Santa section                                        */}
      {/* ============================================================ */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span>{"Semana Santa (d\u00edas no laborales)"}</span>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Dates row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="w-full sm:w-48">
              <Input
                label="Fecha inicio"
                type="date"
                value={ssConfig.fecha_inicio}
                onChange={(e) => setSsConfig((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
              />
            </div>
            <div className="w-full sm:w-48">
              <Input
                label="Fecha fin"
                type="date"
                value={ssConfig.fecha_fin}
                onChange={(e) => setSsConfig((prev) => ({ ...prev, fecha_fin: e.target.value }))}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSaveSemanaSanta}
              loading={savingSemana}
              size="md"
            >
              Guardar
            </Button>
          </div>

          {/* Exceptions */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Excepciones (programas que trabajan en Semana Santa)
            </h4>
            {excepciones.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {excepciones.map((exc, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{exc.programa}</span>
                    {exc.motivo && (
                      <span className="text-xs text-zinc-500">({exc.motivo})</span>
                    )}
                    <button
                      onClick={() => handleRemoveExcepcion(i)}
                      className="ml-auto text-zinc-400 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 mb-3">{"No hay excepciones configuradas para este per\u00edodo"}</p>
            )}
            {/* Add exception */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-48">
                <Input
                  placeholder="Nombre del programa"
                  value={newExcPrograma}
                  onChange={(e) => setNewExcPrograma(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  placeholder={"Motivo (opcional)"}
                  value={newExcMotivo}
                  onChange={(e) => setNewExcMotivo(e.target.value)}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={handleAddExcepcion}>
                {"+ Agregar excepci\u00f3n"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  Cortes por Grado section                                    */}
      {/* ============================================================ */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-zinc-950/5 dark:border-white/5">
          <h2 className="font-semibold text-zinc-950 dark:text-white">Cortes por Grado</h2>
        </div>
        <Tabs
          tabs={GRADOS.map((g) => ({
            id: g.id,
            label: g.label,
            count: g.numCortes,
          }))}
          activeTab={activeGrado}
          onTabChange={setActiveGrado}
        />

        <div className="p-5">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 bg-zinc-200 rounded flex-1" />
                  <div className="h-10 bg-zinc-200 rounded flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Cortes form */}
              <div className="space-y-3">
                {currentCortes.map((corte) => (
                  <div
                    key={corte.num_corte}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-2 px-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <div className={`w-2.5 h-2.5 rounded-full ${CORTE_COLORS[(corte.num_corte - 1) % CORTE_COLORS.length]}`} />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Corte {ROMAN[corte.num_corte - 1]}
                      </span>
                    </div>
                    <div className="flex-1 w-full sm:w-auto">
                      <Input
                        type="date"
                        value={corte.fecha_inicio}
                        onChange={(e) => updateCorte(corte.num_corte, 'fecha_inicio', e.target.value)}
                      />
                    </div>
                    <span className="text-zinc-400 hidden sm:block">{"\u2192"}</span>
                    <div className="flex-1 w-full sm:w-auto">
                      <Input
                        type="date"
                        value={corte.fecha_fin}
                        onChange={(e) => updateCorte(corte.num_corte, 'fecha_fin', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {renderTimeline()}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button
                  variant="primary"
                  onClick={handleSaveCortes}
                  loading={saving}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  }
                >
                  Guardar {activeGrado}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCopyFromGrado('');
                    setShowCopyModal(true);
                  }}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                  }
                >
                  Copiar de otro grado
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCopyModal(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Copiar cortes a {activeGrado}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Seleccione el grado de origen
              </p>
            </div>
            <div className="p-6 space-y-2">
              {GRADOS.filter((g) => g.id !== activeGrado).map((g) => {
                const hasData = (cortesByGrado[g.id] || []).some(
                  (c) => c.fecha_inicio && c.fecha_fin
                );
                return (
                  <button
                    key={g.id}
                    onClick={() => setCopyFromGrado(g.id)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer
                      ${
                        copyFromGrado === g.id
                          ? 'border-zinc-950 bg-zinc-950/5 text-zinc-950 dark:border-white dark:bg-white/5 dark:text-white'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300'
                      }
                    `}
                  >
                    <span>{g.label} ({g.numCortes} cortes)</span>
                    {hasData && <Badge color="emerald">Con datos</Badge>}
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowCopyModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleCopy} disabled={!copyFromGrado}>
                Copiar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
