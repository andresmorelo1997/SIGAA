from django.urls import path
from . import views

urlpatterns = [
    path("", views.carga_list, name="academic-load-list"),
    path("import/", views.import_upload, name="academic-load-import"),
    path("import/preview/", views.import_preview, name="academic-load-import-preview"),
    path("history/", views.history_list, name="academic-load-history"),
    path("history/<int:pk>/download/", views.history_download, name="academic-load-history-download"),
]
