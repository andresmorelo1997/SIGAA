from django.urls import path
from . import views

urlpatterns = [
    path("", views.consolidado, name="payroll-consolidado"),
    path("cortes/", views.cortes_view, name="payroll-cortes"),
]
