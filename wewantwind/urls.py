"""wewantwind URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from backend import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('geojson/', views.CreateGeoJSON, name='creategeojson'),
    path('randompoint/', views.GetRandomPoint, name='randompoint'),
    path('nearestturbine/', views.NearestTurbine, name='nearestturbine'),
    path('sitereport/', views.SiteReport, name='sitereport'),
    path('nearestturbinereport/', views.NearestTurbineReport, name='nearestturbinereport'),
    path('vote/', views.CastVote, name='castvote'),
    path('votes/', views.Votes, name='votes'),
    path('localpeople/', views.LocalPeople, name='localpeople'),
    path('message/', views.SendMessage, name='sendmessage'),
    path('processqueue/', views.ProcessMessageQueue, name='processmessagequeue'),
    path('test/', views.Test, name='test'),
    re_path(r'^confirmvote/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9a-f]{1,32})/$', views.ConfirmVote, name='confirmvote'),
    re_path(r'^confirmmessage/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9a-f]{1,32})/$', views.ConfirmMessage, name='confirmmessage'),
    re_path(r'^removemailinglist/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9a-f]{1,32})/$', views.RemoveMailingList, name='removemailinglist'),
    re_path(r'.*', views.home, name='home'),                                       
]
