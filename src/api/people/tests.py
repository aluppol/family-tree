from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from .models import Person

class PersonTests(TestCase):
    def setUp(self):
        # Create test data
        self.person_data = {
            'name': 'John',
            'family_name': 'Doe',
            'birthday': '1980-01-01T00:00:00Z',
            'father_id': None,
            'mother_id': None,
            'created_by': 1
        }
        self.url = reverse('person-list')

    def test_create_person(self):
        response = self.client.post(self.url, data=self.person_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Person.objects.count(), 1)
        self.assertEqual(Person.objects.first().name, 'John')

    def test_get_person(self):
        person = Person.objects.create(**self.person_data)
        response = self.client.get(reverse('person-detail', args=[person.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'John')

    def test_update_person(self):
        person = Person.objects.create(**self.person_data)
        update_data = {'name': 'Jane'}
        response = self.client.put(reverse('person-detail', args=[person.id]), data=update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Person.objects.get(id=person.id).name, 'Jane')

    def test_delete_person(self):
        person = Person.objects.create(**self.person_data)
        response = self.client.delete(reverse('person-detail', args=[person.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Person.objects.count(), 0)
