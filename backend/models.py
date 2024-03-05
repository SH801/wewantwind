# from django.db import models
from django.contrib.gis.db import models
from django.contrib import admin
from django.contrib.postgres.indexes import GistIndex

# from django.contrib.gis.admin import OSMGeoAdmin

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
            models.Index(fields=['centre']),
            GistIndex(fields=['geometry',]),
        ]

