# Arquitectura — UniSinú

## Stack

```
┌─────────────────────────────────────────┐
│   Navegador                             │
│   (Chrome/Edge/Safari)                  │
└──────────────────┬──────────────────────┘
                   │ HTTP :8000
                   ▼
┌─────────────────────────────────────────┐
│   Gunicorn + Django 4.2                 │
│   Contenedor: horilla-10-server-1            │
│   Templates + WhiteNoise statics        │
└──────────────────┬──────────────────────┘
                   │ psycopg2
                   ▼
┌─────────────────────────────────────────┐
│   PostgreSQL 16                         │
│   Contenedor: horilla-10-db-1                │
│   Volumen: unisinu-data                 │
└─────────────────────────────────────────┘
```

## Apps académicas y modelos

### `academic_load`
Clases programadas (una fila por clase-docente-ciclo).

```
CargaAcademica
├── num_clase          # Código SIGAA de la clase
├── catalogo           # Código de la asignatura
├── descripcion        # Nombre asignatura
├── campus             # MONTR/CEVAL/CECOV/…
├── ciclo_lectivo      # 2661, 2665, …
├── grado              # PREG/POSG/MSTR/DOCT/ESP
├── programa (FK)      # Department
├── docente (FK)       # Employee
├── fecha_inicial      # Cuándo empieza la clase
├── fecha_final        # Cuándo termina
├── hrs_semanal
├── hrs_semestre
└── estado_clase       # Activo/Cancelada/Detenida/Inactivo
```

### `academic_payroll`
Configuración de cortes y snapshots de prenómina.

```
Corte                          PrenominaDocente (snapshot al emitir)
├── periodo (2026-1)           ├── periodo · tipo · docente
├── grado (PREG/POSG/…)        ├── hrs_semana · hrs_semestre
├── num_corte (1-6)            ├── corte_1..corte_6
├── fecha_inicio / fin         ├── hrs_prenomina · saldo
├── emitido (bool)             └── estado (pendiente/emitido)
└── fecha_emision
```

### `academic_plan`
Plan de estudios institucional por programa.

### `academic_reports`
Reportes de planta, carga, dedicación.

---

## Flujo de cálculo de prenómina

```
1. Importación XLSX → CargaAcademica (por clase)
                           │
                           ▼
2. Configurar Cortes del periodo (fecha_inicio, fecha_fin)
                           │
                           ▼
3. Para cada clase, calcular horas por corte:
   overlap = max(clase.fecha_ini, corte.fecha_ini)
             ↔ min(clase.fecha_fin, corte.fecha_fin)
   hrs_en_corte = clase.hrs_semestre × (overlap_days / total_days)
                           │
                           ▼
4. Agrupar por dedicación académica → docente:
   - Catedrático / Medio Tiempo / Tiempo Completo
   - Subtotales por docente y por dedicación
                           │
                           ▼
5. Mostrar en /prenomina/ (formato oficial UniSinú)
                           │
                           ▼
6. "Emitir" congela un snapshot en PrenominaDocente
   para auditoría (re-importar carga ya no altera el congelado).
```

### Derivación de dedicación académica

1. Si el docente tiene `EmployeeWorkInformation.job_position_id` con nombre conteniendo "Tiempo Completo", "Medio Tiempo" o "Catedrático" → se usa ese.
2. Fallback por horas/semana totales del docente:
   - `≥ 40` → Tiempo Completo
   - `≥ 20` → Medio Tiempo
   - `< 20` → Catedrático

---

## Apps legacy (Horilla) — ocultas de la UI

Las apps siguientes existen en el código (por dependencias internas) pero NO aparecen en el sidebar:

- `leave`, `pms`, `recruitment`, `onboarding`, `offboarding`
- `attendance`, `asset`, `helpdesk`, `project`, `payroll` (monetaria)

La lista visible se controla en [`horilla-1.0/horilla/horilla_apps.py`](../horilla-1.0/horilla/horilla_apps.py) → variable `SIDEBARS`.

Las **novedades del docente** (retiros, licencias, cambios de estado) se manejan vía el campo `estado_clase` de `CargaAcademica` — no con el módulo Leave.

---

## URLs principales

| Ruta | App | Nombre |
|---|---|---|
| `/` | core | `sigaa-home` (redirect) |
| `/academic-load/` | academic_load | `academic-load-list` |
| `/academic-load/dashboard/` | academic_load | `academic-dashboard` |
| `/academic-load/import/` | academic_load | `academic-load-import` |
| `/academic-load/anomalias/` | academic_load | `academic-anomalias` |
| `/academic-load/docentes-sin-carga/` | academic_load | `academic-docentes-sin-carga` |
| `/academic-load/reconciliar-docentes/` | academic_load | `academic-reconciliar` |
| `/plan/` | academic_plan | `plan-list` |
| `/plan/validar/` | academic_plan | `plan-validar` |
| `/plan/faltantes/` | academic_plan | `plan-faltantes` |
| `/prenomina/` | academic_payroll | `payroll-detalle` |
| `/prenomina/resumen/` | academic_payroll | `payroll-consolidado` |
| `/prenomina/cortes/` | academic_payroll | `payroll-cortes` |
| `/prenomina/historicos/` | academic_payroll | `payroll-historicos` |
| `/reports/` | academic_reports | `reports-index` |
| `/employee/employee-view/<id>/` | employee | `employee-view-individual` |
