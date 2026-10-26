from django.urls import path

from . import views_support_admin

urlpatterns = [
    path("", views_support_admin.SupportMessagesView.as_view(), name="admin-support-messages"),
]
