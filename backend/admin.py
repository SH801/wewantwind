from django.contrib import admin

# Register your models here.


from .models import Site
from leaflet.admin import LeafletGeoAdmin

admin.site.register(Site, LeafletGeoAdmin)
