from django.urls import reverse_lazy as reverse
from django.utils.translation import gettext_lazy as trans

MENU = trans("Reportes SNIES")
IMG_SRC = "images/ui/document-text-outline.svg"

SUBMENUS = [
    {"menu": trans("Centro de reportes"), "redirect": reverse("reports-index")},
]
