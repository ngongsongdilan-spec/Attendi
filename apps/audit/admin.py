from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "resource_type", "actor", "ip_address")
    list_filter = ("action", "resource_type", "created_at")
    search_fields = ("action", "resource_type", "actor__email", "ip_address")
    readonly_fields = ("id", "actor", "action", "resource_type", "resource_id", "metadata", "ip_address", "user_agent", "created_at")
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
