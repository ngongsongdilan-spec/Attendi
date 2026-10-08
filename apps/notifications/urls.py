from django.urls import path

from . import views

urlpatterns = [
    path("notifications/", views.NotificationListView.as_view(), name="notification-list"),
    path("notifications/<uuid:notification_id>/read/", views.NotificationReadView.as_view(), name="notification-read"),
    path("notifications/read-all/", views.NotificationReadAllView.as_view(), name="notification-read-all"),
]
