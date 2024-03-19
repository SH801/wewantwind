
import os
from polylabel import polylabel
import geojson
from area import area as calculatearea

if __name__ == '__main__':
    import sys
    import django
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir))
    sys.path.append(parent_dir)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wewantwind.settings")
    django.setup()

from django.db.models import Value as V, F, CharField
from django.contrib.gis.db.models.functions import AsGeoJSON
from django.core.serializers.json import DjangoJSONEncoder
from django.contrib.gis.geos import GEOSException, Polygon, GEOSGeometry, Point, fromstr
from django.contrib.gis.db.models.functions import Distance
from django.db import connection, transaction
from django.contrib.gis.db.models import Extent

from backend.models import \
    Site, \
    Boundary

constraintfreefile = '../constraintfree.geojson'
MINIMUMACREAGE = 0.5
MINIMUMDISTANCE = 20

METRES_PER_DEGREE = 111141

cwd = os.path.dirname(os.path.realpath(__file__))

def generatesites():
    print("Deleting existing sites")
    Site.objects.all().delete()

    print("Loading constraintfree file")
    with open(constraintfreefile) as f:
        gj = geojson.load(f)

    features = gj['features']


    featurecount = 0
    for feature in features:
        centre = polylabel(feature['geometry']['coordinates'][0], with_distance=True)
        if centre[1] is None:
            print("Polygon has no centre", feature['geometry']['coordinates'][0])
        else:
            distance = float(centre[1]) * METRES_PER_DEGREE
            # print(centre, distance)
            centrepoint = Point(centre[0][0], centre[0][1])
            centrepoint.srid = 4326
            geometry = GEOSGeometry(str(feature['geometry']))
            meters_sq = calculatearea(feature['geometry'])
            acres = meters_sq * 0.000247105381 # meters^2 to acres
            if distance > MINIMUMDISTANCE:
                featurecount += 1
                print("Polygon", featurecount, centre[0], "distance", distance, "size in acres", acres)
                newsite = Site(centre=centrepoint, geometry=geometry)
                newsite.save()
                # exit()

def importukboundary():
    """
    Import UK boundary from JSON file
    """

    Boundary.objects.all().delete()
    boundaryfile = cwd + '/UKboundary.geojson'

    print("Loading context file", boundaryfile)
    with open(boundaryfile) as f:
        geometrydata = geojson.load(f)
        geometry = GEOSGeometry(str(geometrydata['features'][0]['geometry']))
        geometryobject = Boundary(name='UK Boundary', geometry=geometry)
        geometryobject.save()                     

# importukboundary()

generatesites()