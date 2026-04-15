from django import forms
from .models import CargaAcademica, CAMPUS_CHOICES, GRADO_CHOICES, ESTADO_CHOICES


class FilterForm(forms.Form):
    """Filtros del listado — multi-select con checkboxes (estilo Excel)."""
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={"placeholder": "Buscar descripción, instructor, catálogo…"}),
    )
    campus = forms.MultipleChoiceField(
        required=False, choices=CAMPUS_CHOICES,
        widget=forms.CheckboxSelectMultiple,
    )
    grado = forms.MultipleChoiceField(
        required=False, choices=GRADO_CHOICES,
        widget=forms.CheckboxSelectMultiple,
    )
    estado = forms.MultipleChoiceField(
        required=False, choices=ESTADO_CHOICES,
        widget=forms.CheckboxSelectMultiple,
    )
    ciclo_lectivo = forms.CharField(required=False)
    rango_horas = forms.ChoiceField(
        required=False,
        choices=[
            ("", "— Todos —"),
            ("0-5", "0 a 5 hrs/sem (subutilizado)"),
            ("6-10", "6 a 10 hrs/sem"),
            ("11-20", "11 a 20 hrs/sem"),
            ("21-99", "21+ hrs/sem (sobrecargado)"),
        ],
    )


class ImportUploadForm(forms.Form):
    """Subida del archivo Excel."""
    archivo = forms.FileField(
        label="Archivo Excel",
        widget=forms.FileInput(attrs={"accept": ".xlsx,.xls,.xlsm"}),
    )


class ImportConfirmForm(forms.Form):
    """Confirmación tras preview — el usuario elige qué campus importar."""
    campus_ids = forms.MultipleChoiceField(
        label="Campus a importar",
        widget=forms.CheckboxSelectMultiple,
        required=True,
    )

    def __init__(self, *args, campus_choices=None, **kwargs):
        super().__init__(*args, **kwargs)
        if campus_choices:
            self.fields["campus_ids"].choices = campus_choices


class CargaAcademicaForm(forms.ModelForm):
    class Meta:
        model = CargaAcademica
        fields = "__all__"
