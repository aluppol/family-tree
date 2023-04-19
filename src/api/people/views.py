from rest_framework import generics
from .models import Person
from .serializers import PersonSerializer


class PeopleList(generics.ListCreateAPIView):
    serializer_class = PersonSerializer

    def get_queryset(self):
        queryset = Person.objects.all()

        name = self.request.query_params.get('name')
        if name is not None:
            queryset = queryset.filter(name=name)

        familyName = self.request.query_params.get('family_ame')
        if familyName is not None:
            queryset = queryset.filter(familyName=familyName)

        birthday = self.request.query_params.get('birthday')
        if birthday is not None:
            queryset = queryset.filter(birthday=birthday)

        motherId = self.request.query_params.get('mother_d')
        if motherId is not None:
            queryset = queryset.filter(motherId=motherId)

        fatherId = self.request.query_params.get('father_id')
        if fatherId is not None:
            queryset = queryset.filter(fatherId=fatherId)

        return queryset


class PersonDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PersonSerializer
    queryset = Person.objects.all()
