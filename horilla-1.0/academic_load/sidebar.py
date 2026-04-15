"""
academic_load/sidebar.py — entry para el sidebar Horilla.
"""
from django.urls import reverse_lazy as reverse
from django.utils.translation import gettext_lazy as trans

MENU = trans("Carga Académica")
IMG_SRC = "images/ui/attendances.svg"

SUBMENUS = [
    {
        "menu": trans("Panel de Planta Profesoral"),
        "redirect": reverse("academic-dashboard"),
    },
    {
        "menu": trans("Programación"),
        "redirect": reverse("academic-load-list"),
    },
    {
        "menu": trans("Importar Excel"),
        "redirect": reverse("academic-load-import"),
    },
    {
        "menu": trans("Historial de importaciones"),
        "redirect": reverse("academic-load-history"),
    },
]
