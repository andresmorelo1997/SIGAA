"""
employee/sidebar.py — sidebar del módulo Docentes (UniSinú).
Submenús en español, solo los relevantes al dominio académico.
"""

from django.urls import reverse_lazy as reverse
from django.utils.translation import gettext_lazy as trans

from accessibility.methods import check_is_accessible
from base.templatetags.basefilters import is_reportingmanager

MENU = trans("Docentes")
IMG_SRC = "images/ui/employees.svg"

SUBMENUS = [
    {
        "menu": trans("Mi perfil"),
        "redirect": reverse("employee-profile"),
        "accessibility": "employee.sidebar.profile_accessibility",
    },
    {
        "menu": trans("Listado de docentes"),
        "redirect": reverse("employee-view"),
        "accessibility": "employee.sidebar.employee_accessibility",
    },
    {
        "menu": trans("Solicitudes de documentos"),
        "redirect": reverse("document-request-view"),
        "accessibility": "employee.sidebar.document_accessibility",
    },
    {
        "menu": trans("Organigrama"),
        "redirect": reverse("organisation-chart"),
    },
]


def profile_accessibility(request, submenu, user_perms, *args, **kwargs):
    accessible = False
    try:
        accessible = request.session["selected_company"] == "all" or str(
            request.user.employee_get.employee_work_info.company_id.id
        ) == str(request.session["selected_company"])
    finally:
        return accessible


def document_accessibility(request, submenu, user_perms, *args, **kwargs):
    return request.user.has_perm(
        "horilla_documents.view_documentrequest"
    ) or is_reportingmanager(request.user)


def employee_accessibility(request, submenu, user_perms, *args, **kwargs):
    """
    Employee accessibility method
    """
    cache_key = request.session.session_key + "accessibility_filter"
    employee = getattr(request.user, "employee_get", None)
    return (
        is_reportingmanager(request.user)
        or request.user.has_perm("employee.view_employee")
        or check_is_accessible("employee_view", cache_key, employee)
    )
