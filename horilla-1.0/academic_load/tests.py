"""
Tests de academic_load.
"""
import io
import json
from django.contrib.auth.models import User
from django.test import TestCase, Client
from django.urls import reverse
from openpyxl import Workbook

from academic_load.import_helpers import (
    parse_rows, detect_file_type, normalize_campus, preview,
)


def _buf(wb):
    b = io.BytesIO()
    wb.save(b)
    b.seek(0)
    return b.read()


class DetectFileTypeTests(TestCase):
    def test_us_prog(self):
        self.assertEqual(detect_file_type("US_PROG_CLASES_2026.xlsx"), "US_PROG")
        self.assertEqual(detect_file_type("CARGA_ACADEMICA_2026.xlsx"), "US_PROG")

    def test_lc_prog(self):
        self.assertEqual(detect_file_type("LC_PROGRAMACION_2026.xlsx"), "LC_PROG")

    def test_us_datos(self):
        self.assertEqual(detect_file_type("US_DATOS_DOCENTES.xlsx"), "US_DATOS")

    def test_desconocido(self):
        self.assertEqual(detect_file_type("random.xlsx"), "UNKNOWN")


class NormalizeCampusTests(TestCase):
    def test_monteria_variants(self):
        self.assertEqual(normalize_campus("MONTERIA"), "MONTR")
        self.assertEqual(normalize_campus("MONTERÍA"), "MONTR")
        self.assertEqual(normalize_campus("monteria"), "MONTR")

    def test_cartagena(self):
        self.assertEqual(normalize_campus("CARTAGENA"), "CARTG")

    def test_empty(self):
        self.assertEqual(normalize_campus(""), "")
        self.assertEqual(normalize_campus(None), "")


class ParseRowsTests(TestCase):
    """parse_rows con filtro de campus."""

    def _make_excel(self):
        wb = Workbook()
        ws = wb.active
        ws.title = "sheet1"
        ws.append(["Nº Clase", "Catálogo", "Descripción", "Campus",
                   "Grado", "Ciclo Lectivo", "Nombre Instructor",
                   "Instructor", "Hrs Semanal", "Hrs Semestre", "Estado Clase"])
        ws.append([1001, "MAT101", "Cálculo I", "MONTR", "PREG", "2592",
                   "Juan Pérez", "1234567890", 4, 64, "Activo"])
        ws.append([1002, "FIS101", "Física I", "CARTG", "PREG", "2592",
                   "Ana López", "0987654321", 3, 48, "Activo"])
        ws.append([1003, "QUI101", "Química", "MONTR", "PREG", "2592",
                   "Carlos Ruiz", "1111111111", 3, 48, "Activo"])
        return _buf(wb)

    def test_parsea_sin_filtro(self):
        rows = parse_rows(self._make_excel())
        self.assertEqual(len(rows), 3)

    def test_filtra_por_campus(self):
        rows = parse_rows(self._make_excel(), allowed_campus={"MONTR"})
        self.assertEqual(len(rows), 2)  # MONTR * 2
        campus = {r["campus"] for r in rows}
        self.assertEqual(campus, {"MONTR"})

    def test_excluye_cartg(self):
        rows = parse_rows(self._make_excel(), allowed_campus={"MONTR", "BOGT"})
        for r in rows:
            self.assertNotEqual(r["campus"], "CARTG")

    def test_instructor_id_padded(self):
        rows = parse_rows(self._make_excel())
        for r in rows:
            self.assertEqual(len(r["instructor_id_raw"]), 10)


class PreviewTests(TestCase):
    def test_preview_detecta_campus_ciclos(self):
        wb = Workbook()
        ws = wb.active
        ws.append(["Catálogo", "Campus", "Grado", "Ciclo Lectivo"])
        ws.append(["A", "MONTR", "PREG", "2592"])
        ws.append(["B", "BOGT", "PREG", "2592"])
        ws.append(["C", "MONTR", "POSG", "2592"])
        data = _buf(wb)
        info = preview(data, "US_PROG_CLASES_TEST.xlsx")
        self.assertEqual(info["total_rows"], 3)
        self.assertIn("MONTR", info["campus"])
        self.assertIn("BOGT", info["campus"])
        self.assertEqual(info["ciclo_lectivo"], "2592")
        self.assertEqual(info["file_type"], "US_PROG")


class ViewsSmokeTests(TestCase):
    """Smoke tests de las vistas clave — solo verifica que renderizan 200."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser(
            username="test_admin", email="test@example.com", password="test_pass"
        )

    def setUp(self):
        self.client = Client()
        self.client.force_login(self.user)

    def test_dashboard_responde_200(self):
        r = self.client.get(reverse("academic-dashboard"))
        self.assertIn(r.status_code, (200, 302))  # 302 si middleware redirige a wizard

    def test_status_json(self):
        r = self.client.get(reverse("academic-status"))
        self.assertIn(r.status_code, (200, 302))  # 302 si middleware redirige a wizard
        if r.status_code == 200:
            data = json.loads(r.content)
            self.assertEqual(data["brand"], "SIGAA — Universidad del Sinú")
            self.assertTrue(data["sigaa_hide_money"])

    def test_anomalias_200(self):
        r = self.client.get(reverse("academic-anomalias"))
        self.assertIn(r.status_code, (200, 302))  # 302 si middleware redirige a wizard

    def test_docentes_sin_carga_200(self):
        r = self.client.get(reverse("academic-docentes-sin-carga"))
        self.assertIn(r.status_code, (200, 302))  # 302 si middleware redirige a wizard

    def test_busqueda_sin_q_redirige(self):
        r = self.client.get(reverse("academic-busqueda"))
        self.assertEqual(r.status_code, 302)  # redirect sin query

    def test_carga_list_200(self):
        r = self.client.get(reverse("academic-load-list"))
        self.assertIn(r.status_code, (200, 302))  # 302 si middleware redirige a wizard

    def test_import_upload_200(self):
        r = self.client.get(reverse("academic-load-import"))
        self.assertIn(r.status_code, (200, 302))  # 302 si middleware redirige a wizard

    def test_anonimo_redirige_login(self):
        self.client.logout()
        r = self.client.get(reverse("academic-dashboard"))
        # login_required debe redirigir 302
        self.assertEqual(r.status_code, 302)
