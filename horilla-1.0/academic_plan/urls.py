from django.urls import path
from . import views

urlpatterns = [
    path("", views.plan_list, name="plan-list"),
    path("import/", views.plan_import, name="plan-import"),
    path("validar/", views.plan_validar, name="plan-validar"),
    path("faltantes/", views.plan_faltantes, name="plan-faltantes"),
]
