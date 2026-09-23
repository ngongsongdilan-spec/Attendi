from django.urls import path

from . import views

app_name = "academic"

urlpatterns = [
    path("faculties/", views.FacultyListView.as_view(), name="faculty-list"),
    path("departments/", views.DepartmentListView.as_view(), name="department-list"),
    path("courses/", views.CourseListView.as_view(), name="course-list"),
    path("classes/", views.ClassSessionListView.as_view(), name="class-list"),
    path(
        "school-years/",
        views.SchoolYearListCreateView.as_view(),
        name="school-year-list",
    ),
    path("semesters/", views.SemesterListCreateView.as_view(), name="semester-list"),
    path(
        "semesters/<uuid:pk>/",
        views.SemesterUpdateView.as_view(),
        name="semester-detail",
    ),
]
