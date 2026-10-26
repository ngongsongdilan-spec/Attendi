from django.urls import path

from . import views, views_support

urlpatterns = [
    path("health/", views.HealthCheckView.as_view(), name="health"),
    path("version/", views.VersionView.as_view(), name="version"),
    path("ping/", views.PingView.as_view(), name="ping"),
    path("support/contact/", views_support.SupportContactView.as_view(), name="support-contact"),
]
