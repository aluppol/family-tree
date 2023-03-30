from django.urls import path
from .views import PeopleList, PersonDetail

urlpatterns = [
    path('people/', PeopleList.as_view()),
    path('people/<int:pk>/', PersonDetail.as_view()),
]
