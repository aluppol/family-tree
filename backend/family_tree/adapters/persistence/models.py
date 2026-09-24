from django.db import models
from django.db.models.functions import Now


class FamilyTreeRecord(models.Model):
    owner_kind = models.CharField(max_length=16)
    owner_key = models.CharField(max_length=255)
    home_person = models.ForeignKey(
        "PersonRecord", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(db_default=Now())

    class Meta:
        db_table = "family_tree"
        constraints = (
            models.UniqueConstraint(fields=["owner_kind", "owner_key"], name="family_tree_owner_unique"),
        )
        indexes = (models.Index(fields=["owner_kind", "created_at"], name="family_tree_kind_created"),)


class PersonRecord(models.Model):
    tree = models.ForeignKey(FamilyTreeRecord, on_delete=models.CASCADE, related_name="+")
    given_names = models.CharField(max_length=120, blank=True)
    surname = models.CharField(max_length=120, blank=True)
    sex = models.CharField(max_length=16)
    birth_date = models.CharField(max_length=64, null=True, blank=True)
    birth_sort_date = models.DateField(null=True, blank=True)
    birth_place = models.CharField(max_length=200, blank=True)
    is_deceased = models.BooleanField()
    death_date = models.CharField(max_length=64, null=True, blank=True)
    death_place = models.CharField(max_length=200, blank=True)
    biography = models.TextField(blank=True)
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        db_table = "person"
        indexes = (models.Index(fields=["tree", "surname", "given_names", "id"], name="person_tree_name"),)


class ParentLinkRecord(models.Model):
    tree = models.ForeignKey(FamilyTreeRecord, on_delete=models.CASCADE, related_name="+")
    parent = models.ForeignKey(PersonRecord, on_delete=models.CASCADE, related_name="+")
    child = models.ForeignKey(PersonRecord, on_delete=models.CASCADE, related_name="+")
    kind = models.CharField(max_length=16)
    created_at = models.DateTimeField(db_default=Now())

    class Meta:
        db_table = "parent_link"
        constraints = (
            models.UniqueConstraint(fields=["parent", "child"], name="parent_link_unique_pair"),
            models.CheckConstraint(
                condition=~models.Q(parent=models.F("child")), name="parent_link_not_self"
            ),
        )
        indexes = (
            models.Index(fields=["tree", "child"], name="parent_link_tree_child"),
            models.Index(fields=["tree", "parent"], name="parent_link_tree_parent"),
        )


class PartnershipRecord(models.Model):
    tree = models.ForeignKey(FamilyTreeRecord, on_delete=models.CASCADE, related_name="+")
    first_partner = models.ForeignKey(PersonRecord, on_delete=models.CASCADE, related_name="+")
    second_partner = models.ForeignKey(PersonRecord, on_delete=models.CASCADE, related_name="+")
    kind = models.CharField(max_length=16)
    start_date = models.CharField(max_length=64, null=True, blank=True)
    start_sort_date = models.DateField(null=True, blank=True)
    start_place = models.CharField(max_length=200, blank=True)
    end_reason = models.CharField(max_length=16, null=True, blank=True)
    end_date = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(db_default=Now())

    class Meta:
        db_table = "partnership"
        constraints = (
            models.CheckConstraint(
                condition=~models.Q(first_partner=models.F("second_partner")), name="partnership_not_self"
            ),
        )
        indexes = (
            models.Index(fields=["tree", "first_partner"], name="partnership_tree_first"),
            models.Index(fields=["tree", "second_partner"], name="partnership_tree_second"),
        )


class PersonPhotoRecord(models.Model):
    person = models.OneToOneField(PersonRecord, primary_key=True, on_delete=models.CASCADE, related_name="+")
    tree = models.ForeignKey(FamilyTreeRecord, on_delete=models.CASCADE, related_name="+")
    media_type = models.CharField(max_length=32)
    content = models.BinaryField()
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        db_table = "person_photo"
        indexes = (models.Index(fields=["tree"], name="person_photo_tree"),)
