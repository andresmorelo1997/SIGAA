# Changelog

## 2026-04-15 — Unificación y rebranding

### Cambios mayores
- **Stack único**: eliminado todo el código Next.js legacy. El único frontend/backend es Django + templates en `app/`.
- **Sidebar limpio**: solo módulos académicos (Carga, Plan, Prenómina, Reportes, Docentes). Ocultos Leave, Performance, Recruitment, etc.
- **Retiros docentes** se gestionan via `estado_clase` de `CargaAcademica`, NO por módulo Leave.
- **Rebranding**: ninguna mención de "Horilla" o "SIGAA" en UI visible — todo es "UniSinú" / "Universidad del Sinú".

### Prenómina
- Nueva vista `/prenomina/` con formato oficial UniSinú (1 fila por clase, agrupado por dedicación/docente, subtotales).
- Cálculo correcto por **overlap de fechas** clase↔corte (antes era reparto uniforme incorrecto).
- Derivación de dedicación por `JobPosition` con fallback por hrs/semana.
- Filtros: periodo, corte, dedicación, campus, búsqueda.
- Botón imprimir con CSS print-friendly.

### Fixes
- `ImportError: sigaa_flags` — context processor huérfano eliminado.
- `NoReverseMatch: academic-dashboard` — sincronización de apps en el contenedor.
- Grid de accesos rápidos reemplazado por CSS Grid 4-col uniforme con secciones.

### Organización
- Creada carpeta `docs/` con ARQUITECTURA.md y GUIA_USUARIO.md.
- `horilla-1.0/` conservado como carpeta raíz del backend Django (renombrar implicaría perder el volumen persistente de PostgreSQL).
- README raíz reescrito como entrada profesional al proyecto.
