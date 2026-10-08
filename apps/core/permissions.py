"""Role-based permission helpers (User Roles & Permissions Specification).

Roles are enforced here AND at object level in views - hiding UI controls is
never a security mechanism (doc 02 §30).
"""
from rest_framework.permissions import BasePermission

ADMIN_ROLES = {"DEPARTMENT_ADMIN", "FACULTY_ADMIN", "SYSTEM_ADMIN"}
STAFF_ROLES = {"LECTURER"} | ADMIN_ROLES


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "STUDENT"


class IsLecturer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "LECTURER"


class IsLecturerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in STAFF_ROLES


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ADMIN_ROLES


class IsSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "SYSTEM_ADMIN"
