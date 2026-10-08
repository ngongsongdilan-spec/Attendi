from django.urls import path

from . import views

urlpatterns = [
    path("projects/", views.ProjectListView.as_view(), name="project-list"),
    path("projects/create/", views.ProjectListView.as_view(), name="project-create"),
    path("projects/<uuid:project_id>/", views.ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<uuid:project_id>/overview/", views.ProjectOverviewView.as_view(), name="project-overview"),
    path("projects/<uuid:project_id>/groups/", views.ProjectGroupsView.as_view(), name="project-groups"),
    path("projects/<uuid:project_id>/groups/<uuid:group_id>/", views.ProjectGroupDetailView.as_view(), name="project-group-detail"),
    path("projects/<uuid:project_id>/groups/<uuid:group_id>/report/", views.GroupReportView.as_view(), name="group-report"),
    path("projects/<uuid:project_id>/groups/<uuid:group_id>/members/", views.ProjectGroupMembersView.as_view(), name="group-members"),
    path("projects/<uuid:project_id>/groups/<uuid:group_id>/members/<uuid:student_id>/", views.ProjectGroupMembersView.as_view(), name="group-member-delete"),
    path("projects/<uuid:project_id>/unassigned/", views.ProjectUnassignedView.as_view(), name="project-unassigned"),
    path("projects/<uuid:project_id>/sync-members/", views.ProjectSyncMembersView.as_view(), name="project-sync-members"),
    path("projects/<uuid:project_id>/tasks/", views.ProjectTasksView.as_view(), name="project-tasks"),
    path("tasks/<uuid:task_id>/", views.TaskDetailView.as_view(), name="task-detail"),
    path("tasks/<uuid:task_id>/complete/", views.TaskCompleteView.as_view(), name="task-complete"),
    path("projects/<uuid:project_id>/contributions/", views.ProjectContributionsView.as_view(), name="project-contributions"),
    path("projects/<uuid:project_id>/documents/", views.ProjectDocumentsView.as_view(), name="project-documents"),
    path("projects/<uuid:project_id>/assessments/", views.ProjectAssessmentsView.as_view(), name="project-assessments"),
    path("assessments/<uuid:assessment_id>/records/", views.AssessmentRecordsView.as_view(), name="assessment-records"),
    path("projects/<uuid:project_id>/milestones/", views.ProjectMilestonesView.as_view(), name="project-milestones"),
    path("milestones/<uuid:milestone_id>/", views.ProjectMilestoneDetailView.as_view(), name="milestone-detail"),
    path("projects/<uuid:project_id>/candidates/", views.ProjectCandidatesView.as_view(), name="project-candidates"),
    path("projects/archive/", views.ProjectArchiveView.as_view(), name="project-archive"),
    path("course-offerings/<uuid:offering_id>/delegate/", views.ClassDelegateView.as_view(), name="class-delegate"),
    path("course-offerings/<uuid:offering_id>/delegate-candidates/", views.OfferingDelegateCandidatesView.as_view(), name="class-delegate-candidates"),
    path("course-offerings/<uuid:offering_id>/groups/", views.OfferingGroupsView.as_view(), name="offering-groups"),
]
