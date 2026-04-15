# Horilla (Django) — stack único

El proyecto **UNISINU-Horilla** vive completamente en `horilla-1.0/` (Django + PostgreSQL en Docker). No hay Next.js, no hay SIGAA legacy: todo quedó migrado.

## Cómo correrlo
```bash
cd horilla-1.0
docker compose up            # expone http://localhost:8000
```

## Reglas
- Siempre usar el contenedor `horilla-10-server-1` para ejecutar comandos Django (`docker exec horilla-10-server-1 python manage.py …`).
- La app de prenómina/carga académica vive en `horilla-1.0/academic_payroll/`.
- No crear proyectos paralelos fuera de `horilla-1.0/`.
- No reintroducir Next.js ni archivos SIGAA: el frontend es Django templates + oh-* components.
