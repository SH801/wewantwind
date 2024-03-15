# from django.db import models
from django.contrib.gis.db import models
from django.contrib import admin
from django.contrib.postgres.indexes import GistIndex

# from django.contrib.gis.admin import OSMGeoAdmin
from leaflet.admin import LeafletGeoAdmin

# Create your models here.


class Site(models.Model):
    """
    Stores a potential constraint-free site area (polygon) including its pole of inaccessibility (point) 
    """
    centre = models.PointField(null=True, blank=True)
    geometry = models.GeometryField(null=True, blank=True)

    def _get_geometry(self):
        return self.geometry

    geom = property(_get_geometry)
    
    class Meta:
        indexes = [
            GistIndex(fields=['centre']),
            GistIndex(fields=['geometry',]),
        ]

class Vote(models.Model):
    """
    Stores a user-specific vote for a particular wind turbine site 
    """

    name = models.CharField(max_length=100, default='', blank=True)
    email = models.CharField(max_length=100, default='', blank=True)
    confirmed = models.BooleanField(null=False, default=False)
    contactable = models.BooleanField(null=False, default=False)
    userlocation = models.PointField(null=True, blank=True)
    site = models.PointField(null=True, blank=True)
    ip = models.CharField(max_length=100, default='', blank=True)
    token = models.CharField(max_length=100, default='', blank=True)
    date = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name', 'email', '-date') 
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['email',]),
            models.Index(fields=['confirmed',]),
            models.Index(fields=['contactable',]),
            models.Index(fields=['ip',]),
            models.Index(fields=['token',]),
            GistIndex(fields=['userlocation']),
            GistIndex(fields=['site']),
        ]

class VoteAdmin(LeafletGeoAdmin):
    list_display = ['name', 'email', 'confirmed', 'contactable', 'ip', 'date']

    list_filter = (
        'contactable',
    )

    search_fields = (
        'name',
        'email',
        'confirmed',
        'contactable',
        'ip'
    )

class Message(models.Model):
    """
    Message queue - for sending to local users within specific area
    """

    name = models.CharField(max_length=100, default='', blank=True)
    email = models.CharField(max_length=100, default='', blank=True)
    confirmed = models.BooleanField(null=False, default=False)
    sent = models.BooleanField(null=False, default=False)
    userlocation = models.PointField(null=True, blank=True)
    ip = models.CharField(max_length=100, default='', blank=True)
    token = models.CharField(max_length=100, default='', blank=True)
    date = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name', 'email', '-date') 
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['email',]),
            models.Index(fields=['confirmed',]),
            models.Index(fields=['sent',]),
            models.Index(fields=['ip',]),
            models.Index(fields=['token',]),
            GistIndex(fields=['userlocation']),
        ]

class MessageAdmin(LeafletGeoAdmin):
    list_display = ['name', 'email', 'confirmed', 'sent', 'ip', 'date']

    list_filter = (
        'confirmed',
        'sent'
    )

    search_fields = (
        'name',
        'email',
        'confirmed',
        'sent',
        'ip',
        'date'
    )

class Boundary(models.Model):
    """
    Stores boundary areas, eg counties, to allow geography-specific views
    """
    name = models.CharField(max_length = 200, blank=True)
    geometry = models.GeometryField(null=True, blank=True)
    
    def _get_geometry(self):
        return self.geometry

    geom = property(_get_geometry)
    
    class Meta:
        ordering = ('name',) 
        indexes = [
            models.Index(fields=['name',]),
            GistIndex(fields=['geometry']),
        ]

    def __str__(self):
        return self.name
