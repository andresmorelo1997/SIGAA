# UniSinú — stack único (Django + PostgreSQL en Docker)

El proyecto vive completamente en `horilla-1.0/`. Es una aplicación Django 4.2 desplegada con Docker Compose. No hay Next.js, no hay SIGAA legacy, no hay dos códigos.

## Cómo correrlo

```bash
cd horilla-1.0
docker compose up           # http://localhost:8000
```

## Reglas obligatorias para agentes

1. **Nunca** reintroducir la marca **"Horilla"** en UI visible al usuario (títulos, subtítulos, breadcrumbs, alerts, mensajes, textos de botones). Usar siempre **"UniSinú"** / **"Universidad del Sinú"**.
2. **Nunca** reintroducir la marca **"SIGAA"** en UI visible. El sistema se llama UniSinú.
3. El sidebar solo muestra módulos académicos (`academic_*` + `employee`). No agregar Leave, Performance, Recruitment, Payroll monetaria, etc. Si hay que modificar, editar la variable `SIDEBARS` en `horilla-1.0/horilla/horilla_apps.py`.
4. Las **novedades docentes** (retiros, licencias, cambios) se gestionan via `estado_clase` de `CargaAcademica`. NO por el módulo Leave de Horilla.
5. La prenómina maneja **horas, no dinero**. Nunca introducir cálculos monetarios en `academic_payroll`.
6. Siempre ejecutar comandos Django dentro del contenedor: `docker exec horilla-10-server-1 python manage.py …`.
7. Si hay que modificar código de apps fuera de `horilla-1.0/horilla/`, sincronizar al contenedor con `docker cp` antes de reiniciar (el volumen solo monta `./horilla`).
8. La vista `/prenomina/` debe mantener **formato oficial UniSinú** (1 fila por clase, agrupado por dedicación/docente, subtotales, columnas exactas).

## Apps académicas

- `academic_load` — carga académica + importador XLSX + anomalías + reconciliar
- `academic_plan` — plan de estudios + validación vs carga
- `academic_payroll` — prenómina docente + cortes + snapshots
- `academic_reports` — reportes institucionales

## Documentación adicional

- `README.md` — entrada al proyecto
- `docs/ARQUITECTURA.md` — diagrama, modelos, flujo de cálculo
- `docs/GUIA_USUARIO.md` — cómo usar cada módulo
- `docs/CHANGELOG.md` — historial de cambios
