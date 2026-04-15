from django.urls import reverse_lazy as reverse
from django.utils.translation import gettext_lazy as trans

MENU = trans("Plan de Estudios")
IMG_SRC = "images/ui/book-outline.svg"

SUBMENUS = [
    {"menu": trans("Programas"), "redirect": reverse("plan-list")},
    {"menu": trans("Validación de Carga"), "redirect": reverse("plan-validar")},
]
