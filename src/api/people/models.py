from django.db import models


class Person(models.Model):
    name = models.CharField(max_length=255)
    family_name = models.CharField(max_length=255)
    birthday = models.DateTimeField()
    father_id = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='father')
    mother_id = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='mother')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    deleted_by = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} {self.family_name}"

    class Meta:
        db_table = u'"people\".\"people"'
