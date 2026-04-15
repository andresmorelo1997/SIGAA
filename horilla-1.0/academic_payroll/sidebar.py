from django.urls import reverse_lazy as reverse
from django.utils.translation import gettext_lazy as trans

MENU = trans("Prenómina Docente")
IMG_SRC = "images/ui/leave.svg"

SUBMENUS = [
    {"menu": trans("Consolidado"), "redirect": reverse("payroll-consolidado")},
    {"menu": trans("Cortes"), "redirect": reverse("payroll-cortes")},
    {"menu": trans("Histórico emitidos"), "redirect": reverse("payroll-historicos")},
]
