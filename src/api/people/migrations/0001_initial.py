# Generated by Django 4.1.7 on 2023-04-06 20:07

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Person',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('family_name', models.CharField(max_length=255)),
                ('birthday', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True, null=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.IntegerField(blank=True)),
                ('updated_by', models.IntegerField(blank=True, null=True)),
                ('deleted_by', models.DateTimeField(blank=True, null=True)),
                ('father_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='father', to='people.person')),
                ('mother_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mother', to='people.person')),
            ],
        ),
    ]
