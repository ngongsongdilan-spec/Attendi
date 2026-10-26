from django.contrib import admin

from .models import PlatformUpdate


@admin.register(PlatformUpdate)
class PlatformUpdateAdmin(admin.ModelAdmin):
    list_display = ("version", "title", "is_active", "published_at", "created_at")
    list_filter = ("is_active",)
    search_fields = ("version", "title", "message")
    readonly_fields = ("created_at", "updated_at")
