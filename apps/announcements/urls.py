from django.urls import path

from . import views

urlpatterns = [
    path("announcements/", views.AnnouncementListView.as_view(), name="announcement-list"),
    path("announcements/read-state/", views.MyAnnouncementReadStateView.as_view(), name="announcement-read-state"),
    path("announcements/<uuid:announcement_id>/", views.AnnouncementDetailView.as_view(), name="announcement-detail"),
    path("announcements/<uuid:announcement_id>/pin/", views.AnnouncementPinView.as_view(), name="announcement-pin"),
    path("announcements/<uuid:announcement_id>/read/", views.AnnouncementReadView.as_view(), name="announcement-read"),
    path("announcements/<uuid:announcement_id>/readers/", views.AnnouncementReadersView.as_view(), name="announcement-readers"),
]
