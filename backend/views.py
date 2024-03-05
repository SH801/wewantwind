import json

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder

from .models import Site

# Create your views here.

def OutputJson(json_array={'result': 'failure'}):
    json_data = json.dumps(json_array, cls=DjangoJSONEncoder, indent=2)
    return HttpResponse(json_data, content_type="text/json")

def OutputError():
    return OutputJson()

@csrf_exempt
def NearestTurbine(request):
    """
    Get nearest turbine to supplied point
    """

    try:
        latlng = json.loads(request.body)
    except ValueError:
        return OutputError()

    # latlng = {'lng': -0.147562, 'lat': 50.8289154}
    centre = None
    if 'lat' in latlng and 'lng' in latlng:
        centre = Point(latlng['lng'], latlng['lat'], srid=4326)
    
    sites = Site.objects.all().annotate(distance=Distance('centre' , centre )).order_by('distance')
    if sites is None: return OutputError()

    site = sites.first()

    results = {}
    results['currentlng'] = latlng['lng']
    results['currentlat'] = latlng['lat']
    results['turbinelat'] = site.centre.coords[1]
    results['turbinelng'] = site.centre.coords[0]
    results['distance_mi'] = site.distance.mi
    results['distance_km'] = site.distance.km
    results['distance_m'] = site.distance.m

    return OutputJson(results)


