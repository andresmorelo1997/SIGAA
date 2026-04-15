# UniSinú — Plataforma Académica

Sistema web único para la **gestión académica de la Universidad del Sinú Elías Bechara Zainúm**. Cubre carga académica, plan de estudios, prenómina docente (horas), novedades docentes y reportes institucionales.

> Stack: **Django 4.2 + PostgreSQL 16**, desplegado con **Docker Compose**. Interfaz Django templates.

---

## 1 · Arranque rápido

```bash
cd horilla-1.0
docker compose up       # http://localhost:8000
```

Credenciales por defecto (seed inicial): `admin / admin`.

Comandos útiles dentro del contenedor:

```bash
docker exec -it horilla-10-server-1 python manage.py shell
docker exec horilla-10-server-1 python manage.py migrate
docker compose restart server
```

---

## 2 · Estructura del repositorio

```
.
├── horilla-1.0/                          # Código Django (antes horilla-1.0/)
│   ├── docker-compose.yaml       # server + Postgres
│   ├── Dockerfile
│   ├── manage.py
│   │
│   ├── academic_load/            # ✅ Carga Académica + Importador XLSX
│   ├── academic_plan/            # ✅ Plan de Estudios + validación cruzada
│   ├── academic_payroll/         # ✅ Prenómina docente · Cortes · Detalle oficial
│   ├── academic_reports/         # ✅ Reportes institucionales (SNIES y otros)
│   │
│   ├── employee/                 # ⚙️ Modelo base de Docentes (reusado)
│   ├── base/                     # ⚙️ Núcleo (Company, Department, Auth)
│   ├── ...                       # ⚙️ Apps secundarias usadas como dependencia
│   │
│   ├── templates/                # Templates globales (layout, sidebar)
│   └── static/                   # CSS/JS/imágenes
│
├── docs/
│   ├── ARQUITECTURA.md           # Diagrama y flujos principales
│   ├── GUIA_USUARIO.md           # Cómo usar cada módulo
│   └── CHANGELOG.md              # Historial de cambios
│
├── .claude/                      # Config Claude Code (local, no deploy)
├── AGENTS.md                     # Instrucciones para agentes de IA
├── CLAUDE.md                     # (apunta a AGENTS.md)
└── README.md                     # (este archivo)
```

---

## 3 · Módulos académicos

| Módulo | Ruta | Responsabilidad |
|---|---|---|
| **Carga Académica** | `/academic-load/` | Importar XLSX `US_PROG_CLASES`, listar clases, detectar anomalías, reconciliar docentes |
| **Plan de Estudios** | `/plan/` | Asignaturas por programa, validación vs carga programada, faltantes |
| **Prenómina Docente** | `/prenomina/` | Cortes, cálculo de horas por corte (overlap fechas), detalle oficial UniSinú, constancias |
| **Reportes** | `/reports/` | Planta profesoral, carga por dedicación, reportes internos |
| **Docentes** | `/employee/employee-view/` | Perfil del docente con tabs "Carga Académica" y "Prenómina" |

### Flujo típico

1. **Importar** el `US_PROG_CLASES.xlsx` desde `/academic-load/import/` al inicio del semestre.
2. **Reconciliar** docentes si hubo cambios de cédula en `/academic-load/reconciliar-docentes/`.
3. **Validar** cobertura en `/plan/validar/` (asignaturas del plan sin clase programada).
4. **Configurar cortes** del periodo en `/prenomina/cortes/` (típicamente 4).
5. **Consultar prenómina** en `/prenomina/?corte=N` y emitir (congelar) en `/prenomina/cortes/`.
6. **Exportar Excel** desde cualquier listado con el botón `Exportar`.

---

## 4 · Datos técnicos

- **Base de datos**: PostgreSQL, volumen persistente `unisinu-data`.
- **Horas, no dinero**: la prenómina trabaja con horas semanales/semestrales. La nómina monetaria (cálculo de pago) se maneja fuera del sistema.
- **Modelos centrales**: `CargaAcademica`, `Corte`, `PrenominaDocente`, `Employee`.
- **Autenticación**: Django contrib.auth (JWT opcional para API).
- **Timezone**: `America/Bogota`.

Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) para el diagrama completo.

---

## 5 · Desarrollo

```bash
# entrar al shell del contenedor para debug
docker exec -it horilla-10-server-1 bash

# crear migraciones cuando cambie un modelo
docker exec horilla-10-server-1 python manage.py makemigrations
docker exec horilla-10-server-1 python manage.py migrate

# logs en vivo
docker logs -f horilla-10-server-1
```

### Convenciones

- Todo el código nuevo vive en `horilla-1.0/academic_*/`.
- Las apps tipo `employee`, `base` se extienden solo cuando es estrictamente necesario.
- Rebranding: nunca usar la cadena **"Horilla"** en UI visible al usuario.
- Monedas: **no aplican**. Este sistema solo maneja horas.

---

## 6 · Licencia y créditos

Proyecto interno Universidad del Sinú Elías Bechara Zainúm.

Construido sobre el framework open-source base Horilla (internamente), con refactor completo para el dominio académico. Todos los módulos HR originales (Leave, Performance, Recruitment, Payroll monetaria, Attendance, Assets) fueron ocultos de la UI porque no aplican al flujo académico — las novedades docentes (retiros, licencias, cambios) se gestionan vía **estados de Carga Académica** (`Activo`, `Cancelada`, `Detenida`, `Inactivo`).
