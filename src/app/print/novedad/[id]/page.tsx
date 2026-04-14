'use client';

import { useEffect, useState, useRef, use } from 'react';

/* ================================================================== */
/*  Printable Novedad Form (F-GC-002 / LMR1793)                       */
/*  Universidad del Sinú — Replica exacta del template oficial xlsx  */
/* ================================================================== */

interface Novedad {
  id: number;
  tipo_programa?: string;
  programa?: string;
  periodo?: string;
  motivo?: string;
  motivo_detalle?: string;
  docente_sale?: string;
  docente_sale_id?: string;
  docente_sale_dedicacion?: string;
  fecha_inicio_sale?: string;
  fecha_salida?: string;
  asignatura?: string;
  catalogo?: string;
  num_clase?: string;
  semestre?: string;
  grupo?: string;
  horas_teoricas?: number;
  horas_practicas?: number;
  intensidad_semestral?: number;
  horas_dictadas?: number;
  horas_ausencia?: number;
  horas_restantes?: number;
  aula?: string;
  horario?: string;
  docente_entra?: string;
  docente_entra_id?: string;
  docente_entra_dedicacion?: string;
  fecha_inicio_entra?: string;
  fecha_salida_entra?: string;
  total_horas_contratar?: number;
  observaciones?: string;
  created_at?: string;
  [key: string]: unknown;
}

const MOTIVO_LABELS: Record<string, string> = {
  RENUNCIA: 'Renuncia',
  COMISION_ESTUDIO: 'Comisión de Estudio',
  LICENCIA: 'Licencia',
  REASIGNACION: 'Reasignación de Carga',
  TERMINACION_CONTRATO: 'Terminación de Contrato',
  CAMBIO_HORARIO: 'Cambio de Horario',
  CIERRE_CURSO: 'Cierre de Curso',
  APERTURA_CURSO: 'Apertura de Curso',
  CAMBIO_GRUPO: 'Cambio de Grupo',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function field(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

/* ----- Column widths (percentages of total, tuned for legibility) ----- */
/* A..AA = 27 columns. Sum = 100%                                       */
const COL_WIDTHS = [
  4.0,  // A  - Tipo programa
  7.5,  // B  - Programa / Departamento
  7.0,  // C  - Docente saliente
  2.8,  // D  - Dedic
  4.2,  // E  - Fecha inicio
  4.2,  // F  - Fecha salida
  6.0,  // G  - Asignatura
  3.5,  // H  - Código people
  3.2,  // I  - No. Clase
  2.4,  // J  - Semestre
  2.4,  // K  - Grupo
  2.8,  // L  - Hrs teórica
  2.8,  // M  - Hrs práctica
  2.6,  // N  - Int sem/t
  2.6,  // O  - Hrs dictadas
  2.6,  // P  - Hrs ausencia
  2.6,  // Q  - Hrs restantes
  3.0,  // R  - Aula
  4.5,  // S  - Horario
  1.8,  // T  - Motivo retiro (T:U merged)
  3.6,  // U
  6.5,  // V  - Docente entrante
  2.8,  // W  - Dedic
  4.2,  // X  - Fecha inicio
  4.2,  // Y  - Fecha salida
  3.2,  // Z  - Total hrs contratar
  6.0,  // AA - Observaciones
];

export default function PrintNovedadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [novedad, setNovedad] = useState<Novedad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/novedades?limit=1000`);
        if (!res.ok) throw new Error('Error cargando novedad');
        const data = await res.json();
        const rows: Novedad[] = data.data ?? [];
        const found = rows.find((r) => String(r.id) === id);
        if (!found) {
          setError('Novedad no encontrada');
        } else {
          setNovedad(found);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  /**
   * Generate a real PDF file using html2canvas + jsPDF, then trigger
   * a browser download. The PDF preserves the on-screen layout exactly.
   */
  async function handleDownloadPDF() {
    if (!novedad) return;
    setDownloading(true);
    try {
      // Use server-side PDF generation via Playwright-rendered Chromium.
      // This avoids html2canvas failures with Tailwind v4 OKLCH colors and
      // produces a pixel-accurate PDF every time.
      const res = await fetch(`/api/print/novedad/${novedad.id}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Error generando PDF' }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Novedad_F-GC-002_${novedad.id}_${(novedad.docente_sale || 'docente').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el PDF: ' + (err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>Cargando novedad…</div>;
  }

  if (error || !novedad) {
    return (
      <div style={{ padding: 40, fontFamily: 'Arial, sans-serif', color: '#b91c1c' }}>
        Error: {error || 'No encontrada'}
      </div>
    );
  }

  const tipoProgramaLabel = novedad.tipo_programa === 'POSGRADO' ? 'POSGRADO' : 'PREGRADO';
  const motivoLabel = novedad.motivo ? MOTIVO_LABELS[novedad.motivo] || novedad.motivo : '';
  const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horasRestantes =
    typeof novedad.horas_restantes === 'number'
      ? novedad.horas_restantes
      : typeof novedad.intensidad_semestral === 'number' && typeof novedad.horas_dictadas === 'number'
        ? novedad.intensidad_semestral - novedad.horas_dictadas
        : '';

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 8mm 8mm;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 9px;
          color: #000;
          background: #e5e7eb;
          margin: 0;
          padding: 0;
        }
        .page {
          width: 281mm;
          background: white;
          margin: 20px auto;
          padding: 8mm 6mm;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        @media print {
          .page {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: 100%;
          }
        }
        table.t {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }
        table.t th, table.t td {
          border: 1px solid #000;
          padding: 4px 4px;
          font-size: 8.5px;
          font-family: Arial, sans-serif;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.25;
        }
        table.t th {
          background: #d9d9d9;
          font-weight: bold;
          text-align: center;
        }
        .center { text-align: center; }
        .left { text-align: left; }
        /* ----- Header (3 rows) ----- */
        .hdr-logo {
          padding: 2px !important;
          text-align: center;
          vertical-align: middle;
          background: #fff;
        }
        .hdr-logo img {
          max-width: 100%;
          max-height: 78px;
          display: block;
          margin: 0 auto;
        }
        .hdr-title {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          letter-spacing: 0.3px;
          background: #fff;
        }
        .hdr-meta {
          font-size: 9px;
          background: #fff;
          padding: 5px 7px !important;
        }
        /* ----- Title block (rows 5-9) ----- */
        .title-block {
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          background: #fff;
          padding: 12px 4px !important;
          line-height: 1.6;
        }
        /* ----- Process row (row 4) ----- */
        .proc-label {
          background: #d9d9d9;
          font-weight: bold;
          text-align: center;
          font-size: 10px;
        }
        .proc-value {
          background: #fff;
          font-weight: bold;
          text-align: center;
          font-size: 10px;
        }
        /* ----- Signatures ----- */
        .sig-line {
          height: 60px;
          background: #fff;
          border-bottom: none !important;
        }
        .sig-line.empty {
          border: none !important;
        }
        .sig-label {
          text-align: center;
          font-weight: bold;
          font-size: 9px;
          padding: 7px 3px !important;
          background: #fff;
          vertical-align: top;
        }
        .sig-label.empty {
          border: none !important;
          background: #fff;
        }
        .toolbar {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 8px;
          z-index: 100;
        }
        .btn {
          color: white;
          border: none;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: background 0.15s;
        }
        .btn[disabled] { opacity: 0.6; cursor: wait; }
        .btn-primary { background: #4f46e5; }
        .btn-primary:hover:not([disabled]) { background: #4338ca; }
        .btn-secondary { background: #64748b; }
        .btn-secondary:hover:not([disabled]) { background: #475569; }
      `}</style>

      <div className="toolbar no-print">
        <button
          className="btn btn-primary"
          onClick={handleDownloadPDF}
          disabled={downloading}
        >
          {downloading ? '⏳ Generando…' : '⬇️ Descargar PDF'}
        </button>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          🖨️ Imprimir
        </button>
      </div>

      <div className="page" ref={pageRef}>
        {/* ============================================================ */}
        {/*  HEADER (rows 1-3 in xlsx)                                   */}
        {/*  Logo (A1:G1) | Title (H1:AA1)                              */}
        {/*  Código (A2:G2) | Fecha (H2:T2) | Versión (U2:AA2)         */}
        {/*  Realizó (A3:G3) | Revisó (H3:T3) | Aprobó (U3:AA3)        */}
        {/* ============================================================ */}
        <table className="t">
          <colgroup>
            {COL_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
          <tbody>
            {/* Row 1: Logo + Title */}
            <tr style={{ height: 68 }}>
              <td className="hdr-logo" colSpan={7}>
                <img src="/logos/unisinu-logo.png" alt="Universidad del Sinú" />
              </td>
              <td className="hdr-title" colSpan={20}>
                NOVEDAD DE CARGA ACADÉMICA<br />PREGRADO Y/O POSGRADOS
              </td>
            </tr>
            {/* Row 2: Código | Fecha | Versión */}
            <tr>
              <td className="hdr-meta" colSpan={7}>
                <strong>Código:</strong>&nbsp;&nbsp;F-GC-002
              </td>
              <td className="hdr-meta" colSpan={13}>
                <strong>Fecha:</strong>&nbsp;&nbsp;21/10/2025
              </td>
              <td className="hdr-meta" colSpan={7}>
                <strong>Versión:</strong>&nbsp;&nbsp;003
              </td>
            </tr>
            {/* Row 3: Realizó | Revisó | Aprobó */}
            <tr>
              <td className="hdr-meta" colSpan={7}>
                <strong>Realizó:</strong> Directora Académica
              </td>
              <td className="hdr-meta" colSpan={13}>
                <strong>Revisó:</strong> Profesional de Procesos Institucionales
              </td>
              <td className="hdr-meta" colSpan={7}>
                <strong>Aprobó:</strong> Director de Procesos Institucionales
              </td>
            </tr>
            {/* Row 4: PROCESO | APROPIACIÓN DEL CONOCIMIENTO */}
            <tr style={{ height: 24 }}>
              <td className="proc-label" colSpan={6}>
                PROCESO
              </td>
              <td className="proc-value" colSpan={21}>
                APROPIACIÓN DEL CONOCIMIENTO
              </td>
            </tr>
            {/* Rows 5-9: Title block (merged A5:AA9) */}
            <tr style={{ height: 64 }}>
              <td className="title-block" colSpan={27}>
                UNIVERSIDAD DEL SINÚ - ELÍAS BECHARA ZAINÚM
                <br />
                NOVEDADES DE CARGA ACADÉMICA PREGRADO Y/O POSGRADOS
                <br />
                PERÍODO ACADÉMICO {field(novedad.periodo)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ============================================================ */}
        {/*  DATA TABLE (rows 10-28 in xlsx)                             */}
        {/*  2-row header + 1 data row (we only print 1 novedad)        */}
        {/* ============================================================ */}
        <table className="t" style={{ marginTop: -1 }}>
          <colgroup>
            {COL_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
          <thead>
            {/* Header row 10 */}
            <tr style={{ height: 18 }}>
              <th rowSpan={2}>
                TIPO DE PROGRAMA
                <br />
                (PREGRADO O POSGRADO)
              </th>
              <th rowSpan={2}>
                PROGRAMA /<br />DEPARTAMENTO
              </th>
              <th rowSpan={2}>DOCENTE SALIENTE</th>
              <th rowSpan={2}>DEDIC</th>
              <th colSpan={2}>FECHA</th>
              <th rowSpan={2}>Asignatura</th>
              <th rowSpan={2}>
                Código
                <br />
                people
              </th>
              <th rowSpan={2}>No. Clase</th>
              <th rowSpan={2}>Semestre</th>
              <th rowSpan={2}>Grupo</th>
              <th colSpan={2}>Horas</th>
              <th rowSpan={2}>Int sem/t</th>
              <th rowSpan={2}>
                Hrs
                <br />
                dictadas
              </th>
              <th rowSpan={2}>
                Horas
                <br />
                ausencia
              </th>
              <th rowSpan={2}>
                Hrs
                <br />
                restantes
              </th>
              <th rowSpan={2}>AULA</th>
              <th rowSpan={2}>HORARIO</th>
              <th rowSpan={2} colSpan={2}>
                Motivo el retiro
              </th>
              <th rowSpan={2}>Docente entrante</th>
              <th rowSpan={2}>DEDIC</th>
              <th colSpan={2}>FECHA</th>
              <th rowSpan={2}>
                Total hrs
                <br />
                contratar
              </th>
              <th rowSpan={2}>Observaciones</th>
            </tr>
            {/* Header row 11 (subheaders) */}
            <tr style={{ height: 96 }}>
              <th>INICIO</th>
              <th>SALIDA</th>
              <th>Teórica</th>
              <th>Práctica</th>
              <th>INICIO</th>
              <th>SALIDA</th>
            </tr>
          </thead>
          <tbody>
            {/* Single data row */}
            <tr style={{ height: 30 }}>
              <td className="center">{tipoProgramaLabel}</td>
              <td className="left">{field(novedad.programa)}</td>
              <td className="left">{field(novedad.docente_sale)}</td>
              <td className="center">{field(novedad.docente_sale_dedicacion)}</td>
              <td className="center">{formatDate(novedad.fecha_inicio_sale)}</td>
              <td className="center">{formatDate(novedad.fecha_salida)}</td>
              <td className="left">{field(novedad.asignatura)}</td>
              <td className="center">{field(novedad.catalogo)}</td>
              <td className="center">{field(novedad.num_clase)}</td>
              <td className="center">{field(novedad.semestre)}</td>
              <td className="center">{field(novedad.grupo)}</td>
              <td className="center">{field(novedad.horas_teoricas)}</td>
              <td className="center">{field(novedad.horas_practicas)}</td>
              <td className="center">{field(novedad.intensidad_semestral)}</td>
              <td className="center">{field(novedad.horas_dictadas)}</td>
              <td className="center">{field(novedad.horas_ausencia)}</td>
              <td className="center">{horasRestantes}</td>
              <td className="center">{field(novedad.aula)}</td>
              <td className="center">{field(novedad.horario)}</td>
              <td className="left" colSpan={2}>
                {motivoLabel}
                {novedad.motivo_detalle ? ` — ${novedad.motivo_detalle}` : ''}
              </td>
              <td className="left">{field(novedad.docente_entra)}</td>
              <td className="center">{field(novedad.docente_entra_dedicacion)}</td>
              <td className="center">{formatDate(novedad.fecha_inicio_entra)}</td>
              <td className="center">{formatDate(novedad.fecha_salida_entra)}</td>
              <td className="center">{field(novedad.total_horas_contratar)}</td>
              <td className="left">{field(novedad.observaciones)}</td>
            </tr>
          </tbody>
        </table>

        {/* ============================================================ */}
        {/*  SIGNATURES (rows 31-32 in xlsx)                             */}
        {/*  4 signature blocks separated by empty cells                 */}
        {/*  A31:C31 (cols 1-3) | D31 empty | E31:H31 (cols 5-8)       */}
        {/*  | I31..Q31 empty (cols 9-17) | R31:V31 (cols 18-22)       */}
        {/*  | W31 empty | X31:AA31 (cols 24-27)                       */}
        {/* ============================================================ */}
        <table className="t" style={{ marginTop: 16 }}>
          <colgroup>
            {COL_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
          <tbody>
            <tr>
              <td className="sig-line" colSpan={3}>&nbsp;</td>
              <td className="sig-line empty" colSpan={1}>&nbsp;</td>
              <td className="sig-line" colSpan={4}>&nbsp;</td>
              <td className="sig-line empty" colSpan={9}>&nbsp;</td>
              <td className="sig-line" colSpan={5}>&nbsp;</td>
              <td className="sig-line empty" colSpan={1}>&nbsp;</td>
              <td className="sig-line" colSpan={4}>&nbsp;</td>
            </tr>
            <tr>
              <td className="sig-label" colSpan={3}>
                RECTOR(A) DE SEDE
                <br />
                APRUEBA
              </td>
              <td className="sig-label empty" colSpan={1}>&nbsp;</td>
              <td className="sig-label" colSpan={4}>
                DIRECTOR(A) ACADÉMICO
                <br />
                APRUEBA
              </td>
              <td className="sig-label empty" colSpan={9}>&nbsp;</td>
              <td className="sig-label" colSpan={5}>
                DECANO(A)
                <br />
                AVALA
              </td>
              <td className="sig-label empty" colSpan={1}>&nbsp;</td>
              <td className="sig-label" colSpan={4}>
                JEFE DE PROGRAMA-DPTO
                <br />
                <span style={{ fontSize: 7, fontWeight: 'normal' }}>
                  (Solo aplica para carga académica pregrado)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
