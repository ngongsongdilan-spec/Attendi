from django.urls import path

from . import views

app_name = "academic"

urlpatterns = [
    path("faculties/", views.FacultyListView.as_view(), name="faculty-list"),
    path("departments/", views.DepartmentListView.as_view(), name="department-list"),
    path("courses/", views.CourseListView.as_view(), name="course-list"),
]
