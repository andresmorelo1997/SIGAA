# UNISINU — Horilla

Sistema único de gestión académica (docentes, carga académica, prenómina, cortes) sobre **Horilla / Django + PostgreSQL**.

El stack anterior basado en Next.js / SIGAA fue deprecado y eliminado. Todo está en `horilla-1.0/`.

## Arranque

```bash
cd horilla-1.0
docker compose up
```

Luego abrir http://localhost:8000.

## Apps principales

- `horilla-1.0/academic_payroll/` — carga académica, cortes, prenómina, consolidado.
- `horilla-1.0/employee/` — docentes.
- `horilla-1.0/horilla_api/` — endpoints REST.

## Comandos útiles

```bash
# shell Django dentro del contenedor
docker exec -it horilla-10-server-1 python manage.py shell

# migraciones
docker exec horilla-10-server-1 python manage.py migrate

# reiniciar server
docker compose restart server
```
