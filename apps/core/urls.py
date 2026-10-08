from django.urls import include, path

urlpatterns = [
    path("auth/", include("apps.accounts.urls_auth")),
    path("", include("apps.accounts.urls")),
    path("", include("apps.academics.urls")),
    path("", include("apps.attendance.urls")),
    path("", include("apps.learning.urls")),
    path("", include("apps.announcements.urls")),
    path("", include("apps.projects.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.dashboard.urls")),
]
