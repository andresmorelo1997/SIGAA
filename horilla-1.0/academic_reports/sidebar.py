from django.urls import reverse_lazy as reverse
from django.utils.translation import gettext_lazy as trans

MENU = trans("Reportes Académicos")
IMG_SRC = "images/ui/report.svg"

SUBMENUS = [
    {"menu": trans("Centro de reportes"), "redirect": reverse("reports-index")},
]
