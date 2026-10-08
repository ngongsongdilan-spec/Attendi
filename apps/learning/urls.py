from django.urls import path

from . import views

urlpatterns = [
    path("course-offerings/<uuid:offering_id>/materials/", views.MaterialListView.as_view(), name="material-list"),
    path("materials/<uuid:material_id>/", views.MaterialDetailView.as_view(), name="material-detail"),
    path("files/", views.FileUploadView.as_view(), name="file-upload"),
    path("files/<uuid:file_id>/", views.FileDownloadView.as_view(), name="file-download"),
    path("course-offerings/<uuid:offering_id>/assignments/", views.AssignmentListView.as_view(), name="assignment-list"),
    path("assignments/<uuid:assignment_id>/", views.AssignmentDetailView.as_view(), name="assignment-detail"),
    path("assignments/<uuid:assignment_id>/submissions/", views.AssignmentSubmissionListView.as_view(), name="submission-list"),
    path("submissions/<uuid:submission_id>/", views.AssignmentSubmissionDetailView.as_view(), name="submission-detail"),
    path("classrooms/available-courses/", views.AvailableClassroomCoursesView.as_view(), name="classroom-available-courses"),
    path("classrooms/", views.ClassroomCreateView.as_view(), name="classroom-create"),
    path("course-offerings/<uuid:offering_id>/assessments/", views.AssessmentListView.as_view(), name="assessment-list"),
    path("course-offerings/<uuid:offering_id>/assessment-groups/", views.AssessmentGroupListView.as_view(), name="assessment-group-list"),
    path("assessment-groups/<uuid:group_id>/", views.AssessmentGroupDetailView.as_view(), name="assessment-group-detail"),
    path("assessment-groups/<uuid:group_id>/export.csv", views.AssessmentGroupExportView.as_view(), name="assessment-group-export"),
    path("assessments/<uuid:assessment_id>/", views.AssessmentDetailView.as_view(), name="assessment-detail"),
    path("assessments/<uuid:assessment_id>/marks/", views.AssessmentMarksView.as_view(), name="assessment-marks"),
    path("assessments/<uuid:assessment_id>/export.csv", views.AssessmentExportView.as_view(), name="assessment-export"),
    path("assessment-marks/<uuid:mark_id>/", views.AssessmentMarkDetailView.as_view(), name="assessment-mark-detail"),
    path("students/me/assessments/", views.MyAssessmentsView.as_view(), name="my-assessments"),
]