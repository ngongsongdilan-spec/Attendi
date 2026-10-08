from django.contrib import admin
from .models import Faculty, Department, Semester, Course, CourseOffering, Enrollment, CarryOverApplication, ClassDefinition, ClassSchedule, ClassSession

@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('name', 'academic_year', 'number', 'is_active', 'start_date', 'end_date')
    list_editable = ('is_active',)

@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'faculty')

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'department', 'level', 'credit_units')

@admin.register(CourseOffering)
class CourseOfferingAdmin(admin.ModelAdmin):
    list_display = ('course', 'semester', 'department', 'lecturer', 'status')

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course_offering', 'status')

@admin.register(CarryOverApplication)
class CarryOverApplicationAdmin(admin.ModelAdmin):
    list_display = ('student', 'course_offering', 'status')

@admin.register(ClassDefinition)
class ClassDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'course_offering', 'class_type', 'lecturer')

@admin.register(ClassSchedule)
class ClassScheduleAdmin(admin.ModelAdmin):
    list_display = ('course_offering', 'day_of_week', 'start_time', 'end_time', 'class_type')

@admin.register(ClassSession)
class ClassSessionAdmin(admin.ModelAdmin):
    list_display = ('class_definition', 'starts_at', 'status')
