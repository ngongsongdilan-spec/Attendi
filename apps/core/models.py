from django.db import models


class TimeStampedUUIDModel(models.Model):
    """Abstract base: UUID primary key + created/updated timestamps (UTC)."""

    id = models.UUIDField(primary_key=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.id:
            import uuid

            self.id = uuid.uuid4()
        super().save(*args, **kwargs)
