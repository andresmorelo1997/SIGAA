from django.urls import path
from . import views

urlpatterns = [
    path("", views.consolidado, name="payroll-consolidado"),
    path("cortes/", views.cortes_view, name="payroll-cortes"),
    path("employee-tab/<int:emp_id>/", views.academic_payroll_employee_tab, name="academic-payroll-employee-tab"),
]
