# Guía de usuario — UniSinú

## 1 · Login

Ir a http://localhost:8000 → redirige a `/login/`. Usuario inicial: `admin`.

## 2 · Dashboard académico

Al iniciar sesión verás **KPIs del ciclo activo**:

- **Docentes**: total con carga programada.
- **Clases**: clases programadas.
- **Asignaturas plan**: asignaturas únicas del plan de estudios.
- **Horas totales**: suma de horas semestre.
- **Cobertura plan vs carga**: % asignaturas del plan con clase programada.

Debajo: **Accesos rápidos** agrupados en Carga, Plan, Docentes/Prenómina, y panel de **Últimas importaciones**.

## 3 · Importar carga académica

1. Sidebar → **Carga Académica** → botón **Importar Carga**.
2. Arrastrá el archivo `US_PROG_CLASES.xlsx` (o `LC_PROG` o `US_DATOS_DOCENTES`).
3. Click en **Preview** para ver muestra de filas detectadas.
4. Confirmar → el sistema crea/actualiza `CargaAcademica` y registra un `ImportHistory`.

El reconocimiento del archivo es automático por nombre de columnas.

### Reconciliar docentes

Si la cédula de un docente cambió entre importaciones → botón **Reconciliar docentes** en el historial. Vincula `instructor_id_raw` con el `Employee` correspondiente.

## 4 · Anomalías y docentes sin carga

- **Anomalías**: `/academic-load/anomalias/`. Muestra docentes **sobrecargados** (> 25 h/semana) y **subutilizados** (< 4 h).
- **Docentes sin carga**: `/academic-load/docentes-sin-carga/`. Docentes registrados pero sin ninguna clase asignada en el ciclo.

## 5 · Plan de estudios

- **/plan/** → listar asignaturas por programa.
- **Validar vs Carga** → cruza el plan contra clases programadas; detecta asignaturas pendientes.
- **Faltantes por programar** → lista filtrable para planeación.

## 6 · Prenómina Docente

### Configurar cortes

Sidebar → **Prenómina Docente** → **Cortes**.

- Un corte = periodo con `fecha_inicio` / `fecha_fin` + `grado` (PREG/POSG/MSTR/DOCT).
- Típico: **4 cortes** por semestre por cada grado.
- Al crear un periodo nuevo, precargá los 4 cortes para cada grado.

### Consultar prenómina

`/prenomina/?corte=3&dedicacion=Catedrático`

- **Filtros**: Periodo, Corte (I-IV), Dedicación (Catedrático/MT/TC), Campus, Buscar por nombre/cédula.
- **Formato oficial UniSinú**: una fila por clase, agrupada por dedicación → docente, con subtotales.
- **Imprimir**: botón dedicado (oculta filtros y sidebar en impresión).
- **Cálculo**: horas por corte ponderadas por overlap de fechas clase↔corte.

### Emitir (congelar) un corte

Sidebar → **Prenómina Docente** → **Cortes** → botón **Emitir** en la fila del corte.

- Crea un snapshot `PrenominaDocente` por cada docente del corte.
- Re-importar clases después NO altera el snapshot (auditoría).
- Ver snapshots en `/prenomina/historicos/`.

### Constancia de horas

Perfil del docente → tab **Prenómina** → botón **Constancia**. PDF imprimible con las horas del docente por ciclo.

## 7 · Reportes

`/reports/` → reportes institucionales de planta profesoral, carga por dedicación, totales por programa.

## 8 · Docente logueado (self-service)

Si un Employee inicia sesión (no admin), al entrar a `/` se redirige a su propia vista con solo **sus** clases y horas. También puede ir a `/prenomina/mi-prenomina/` o `/prenomina/mi-constancia/`.
