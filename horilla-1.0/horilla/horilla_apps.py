"""
horilla_apps

This module is used to register horilla addons
"""

from horilla import settings
from horilla.settings import INSTALLED_APPS

INSTALLED_APPS.append("accessibility")
INSTALLED_APPS.append("horilla_audit")
INSTALLED_APPS.append("horilla_widgets")
INSTALLED_APPS.append("horilla_crumbs")
INSTALLED_APPS.append("horilla_documents")
INSTALLED_APPS.append("horilla_views")
INSTALLED_APPS.append("horilla_automations")
INSTALLED_APPS.append("auditlog")
INSTALLED_APPS.append("biometric")
INSTALLED_APPS.append("helpdesk")
INSTALLED_APPS.append("offboarding")
INSTALLED_APPS.append("horilla_backup")
INSTALLED_APPS.append("project")
if settings.env("AWS_ACCESS_KEY_ID", default=None) and "storages" not in INSTALLED_APPS:
    INSTALLED_APPS.append("storages")

# ───────── SIGAA · Universidad del Sinú — apps académicas ─────────
INSTALLED_APPS.append("academic_load")
INSTALLED_APPS.append("academic_payroll")
INSTALLED_APPS.append("academic_reports")
INSTALLED_APPS.append("academic_plan")


AUDITLOG_INCLUDE_ALL_MODELS = True

AUDITLOG_EXCLUDE_TRACKING_MODELS = (
    # ImportHistory tiene file_blob (BinaryField) que rompe el auditlog diff
    "academic_load",
)

setattr(settings, "AUDITLOG_INCLUDE_ALL_MODELS", AUDITLOG_INCLUDE_ALL_MODELS)
setattr(settings, "AUDITLOG_EXCLUDE_TRACKING_MODELS", AUDITLOG_EXCLUDE_TRACKING_MODELS)

settings.MIDDLEWARE.append(
    "auditlog.middleware.AuditlogMiddleware",
)

SETTINGS_EMAIL_BACKEND = getattr(settings, "EMAIL_BACKEND", False)
setattr(settings, "EMAIL_BACKEND", "base.backends.ConfiguredEmailBackend")
if SETTINGS_EMAIL_BACKEND:
    setattr(settings, "EMAIL_BACKEND", SETTINGS_EMAIL_BACKEND)


SIDEBARS = [
    # Sidebar unificado — solo módulos académicos UniSinú.
    # Las novedades/retiros de docentes se gestionan dentro de la propia
    # carga académica (estados: Activo/Cancelada/Detenida/Inactivo).
    "academic_load",     # Carga académica + importador Excel + novedades
    "academic_plan",     # Plan de estudios + validación cruce
    "academic_payroll",  # Prenómina docente · cortes (HORAS, no dinero)
    "academic_reports",  # Reportes institucionales
    "employee",          # Docentes (reusa Employee de Horilla como base)
]

# Activamos white labelling para usar el branding UniSinú/SIGAA
WHITE_LABELLING = True
NESTED_SUBORDINATE_VISIBILITY = False
TWO_FACTORS_AUTHENTICATION = False
