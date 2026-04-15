from django.urls import path
from . import views

urlpatterns = [
    path("", views.consolidado, name="payroll-consolidado"),
    path("cortes/", views.cortes_view, name="payroll-cortes"),
    path("cortes/new/", views.corte_new, name="payroll-corte-new"),
    path("cortes/<int:pk>/edit/", views.corte_edit, name="payroll-corte-edit"),
    path("export/", views.consolidado_export, name="payroll-export"),
    path("employee-tab/<int:emp_id>/", views.academic_payroll_employee_tab, name="academic-payroll-employee-tab"),
]
