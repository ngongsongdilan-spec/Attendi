from django.urls import path

from .views import AttendanceScanView

app_name = "attendance"

urlpatterns = [
    path("scan/", AttendanceScanView.as_view(), name="scan"),
]
