# SIGAA — Universidad del Sinú

Sistema Integrado de Gestión Académica Administrativa sobre Horilla HRMS.

> **Importante**: SIGAA solo maneja **HORAS**, no valores monetarios. Toda
> la UI de $/salarios/contratos se oculta vía `SIGAA_HIDE_MONEY=True`.

## Arrancar en local

```bash
docker compose up -d
# Primera vez:
docker compose exec server python manage.py migrate
# Admin ya viene seedeado: admin / admin
```

Abrir: http://localhost:8000/ → redirige al Dashboard SIGAA.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Redirect al Dashboard (si logeado) o al login |
| `/academic/dashboard/` | Dashboard con KPIs cruzados (docentes, clases, plan, cobertura) |
| `/academic/` | Lista de Carga Académica con filtros (campus, grado, rango horas) |
| `/academic/import/` | Importar Excel US_PROG_CLASES (con preview + selección de campus) |
| `/academic/export/` | Exportar carga filtrada a Excel |
| `/academic/history/` | Historial de importaciones |
| `/plan/` | Lista de Plan de Estudios (540 asignaturas, 34 programas) |
| `/plan/import/` | Importar Excel de Plan (multi-file, formatos A y B) |
| `/plan/validar/` | Cruzar plan vs carga por programa |
| `/plan/faltantes/` | Asignaturas del plan sin programar (panel clave planeación) |
| `/prenomina/` | Consolidado de prenómina en HORAS |
| `/prenomina/export/` | Descargar consolidado Excel |
| `/prenomina/cortes/` | CRUD de cortes de prenómina |
| `/prenomina/cortes/<id>/emitir/` | Emitir corte (congela horas) |
| `/prenomina/historicos/` | Snapshots de cortes emitidos (auditoría) |
| `/reports/` | 10 reportes SNIES (actividad, dedicación, nivel formación, etc.) |
| `/employee/employee-view/<id>/` | Detalle docente con tabs **Carga Académica** y **Prenómina Docente** |

## Flujo de trabajo típico

1. **Importar carga académica** (`/academic/import/`): subir Excel
   `US_PROG_CLASES_*.xlsx` → preview muestra total de filas, campus y
   grados → marcar campus (por defecto excluye CARTG) → Confirmar.
2. **Reconciliar FK docentes** si los Employees no existían al momento
   del import:
   ```bash
   docker compose exec server python manage.py reconciliar_docentes
   ```
3. **Importar plan de estudios** (`/plan/import/`): seleccionar varios
   archivos `.xlsx` del plan. Soporta formatos A (ficha MBA) y B (con
   header en fila 2 `Nom Largo`/`Máx Uni`/`Hrs Cso`).
4. **Verificar cobertura** (`/plan/faltantes/`): asignaturas del plan
   sin clase programada, con % cobertura por programa.
5. **Configurar cortes** (`/prenomina/cortes/new/`): periodo, grado,
   fechas de inicio/fin.
6. **Revisar consolidado** (`/prenomina/`): filtrar por periodo, tipo y
   ciclo. Exportar a Excel.
7. **Emitir corte** (`/prenomina/cortes/<id>/emitir/`): congela las
   horas del momento en un snapshot histórico.

## Estructura de apps

- `academic_load` · Carga Académica + importador + dashboard
- `academic_plan` · Plan de Estudios + validación cruzada
- `academic_payroll` · Prenómina en HORAS + cortes + históricos
- `academic_reports` · 10 reportes SNIES
- `employee`, `base`, etc. · Core Horilla reusado

## Decisiones técnicas

- **Dos formatos de Excel Elysa**: el parser de Plan soporta
  sheet1/Hoja1 (ficha) y sheet1 con header en fila 2 + semestre
  embebido en `Descr` ("MMEPI20212 I Semestre" → "I").
- **Multi-sheet Excel**: `pick_best_sheet` toma la hoja con más
  celdas (los Excel reales tienen metadata en Hoja1 y datos en Hoja2).
- **Auditlog**: `academic_load.ImportHistory` tiene `file_blob`
  (BinaryField) que rompía auditlog → excluido vía
  `AUDITLOG_EXCLUDE_TRACKING_MODELS`.
- **Context processor**: `SIGAA_HIDE_MONEY=True` en
  `base.context_processors.sigaa_flags`. Condiciona todos los tabs de
  dinero en `employee/view/individual.html` y `profile/profile_view.html`.
- **CARTG excluido** por defecto al importar carga académica.
- **URLs custom**: añadidas en `horilla/urls.py` (academic/, plan/,
  prenomina/, reports/). Las apps dinámicas NO auto-registran URLs.
- **Sidebar**: `SIDEBARS` en `horilla/horilla_apps.py` excluye
  `payroll` nativo de Horilla (que maneja $). Los academic_* se
  listan primero.

## Credenciales por defecto

- Usuario: `admin`
- Contraseña: `admin`

(Cambiar en producción desde `/employee/employee-profile/`.)

## Commits relevantes

- `feat: SIGAA integrado como sistema único · solo HORAS`
- `feat: faltantes + exports Excel + links dashboard`
- `feat: 10 reportes SNIES con datos reales + barras dashboard`
- `feat: CRUD cortes + filtro horas + reportes traducibles`
- `feat: emitir cortes + histórico snapshots prenómina`
