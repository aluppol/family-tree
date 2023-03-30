from django.db import models


# Create your models here.
class Person(models.Model):
    name = models.CharField(max_length=255)
    familyName = models.CharField(max_length=255)
    birthday = models.DateTimeField()
    fatherId = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='father')
    motherId = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='mother')

    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True, null=True, blank=True)
    deletedAt = models.DateTimeField(null=True, blank=True)



    class Meta:
        db_table = '"src"."People"'
