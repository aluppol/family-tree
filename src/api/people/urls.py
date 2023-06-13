from django.urls import path
from . import views

urlpatterns = [
    path('', views.PeopleList.as_view(), name='people-list'),
    path('<int:pk>/', views.PersonDetail.as_view(), name='person-detail'),
    # other URL patterns for people service views
]