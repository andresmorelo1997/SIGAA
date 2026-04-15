from django.urls import path
from . import views

urlpatterns = [
    path("", views.carga_list, name="academic-load-list"),
    path("dashboard/", views.dashboard_sigaa, name="academic-dashboard"),
    path("export/", views.carga_export, name="academic-load-export"),
    path("import/", views.import_upload, name="academic-load-import"),
    path("import/preview/", views.import_preview, name="academic-load-import-preview"),
    path("history/", views.history_list, name="academic-load-history"),
    path("history/<int:pk>/download/", views.history_download, name="academic-load-history-download"),
    path("employee-tab/<int:emp_id>/", views.academic_load_employee_tab, name="academic-load-employee-tab"),
]
