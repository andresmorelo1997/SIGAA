from django.urls import path
from . import views

urlpatterns = [
    path("", views.detalle, name="payroll-detalle"),
    path("resumen/", views.consolidado, name="payroll-consolidado"),
    path("cortes/", views.cortes_view, name="payroll-cortes"),
    path("cortes/new/", views.corte_new, name="payroll-corte-new"),
    path("cortes/<int:pk>/edit/", views.corte_edit, name="payroll-corte-edit"),
    path("cortes/<int:pk>/emitir/", views.corte_emitir, name="payroll-corte-emitir"),
    path("historicos/", views.historicos, name="payroll-historicos"),
    path("export/", views.consolidado_export, name="payroll-export"),
    path("employee-tab/<int:emp_id>/", views.academic_payroll_employee_tab, name="academic-payroll-employee-tab"),
    path("constancia/<int:emp_id>/", views.constancia_horas, name="payroll-constancia"),
    path("mi-prenomina/", views.mi_prenomina, name="mi-prenomina"),
    path("mi-constancia/", views.mi_constancia, name="mi-constancia"),
]
