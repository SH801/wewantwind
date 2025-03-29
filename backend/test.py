import os
from polylabel import polylabel
import geojson
from area import area as calculatearea
import ijson
import json
import psycopg2
from psycopg2.extensions import AsIs
from itertools import islice

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

def postgisGetResultsAsDict(sql_text, sql_parameters=None):
    """
    Runs database query and returns results
    """

    POSTGRES_DB = os.environ['POSTGRES_DB']
    POSTGRES_USER = os.environ['POSTGRES_USER']
    POSTGRES_PASSWORD = os.environ['POSTGRES_PASSWORD']

    conn = psycopg2.connect(dbname=POSTGRES_DB, user=POSTGRES_USER, password=POSTGRES_PASSWORD)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if sql_parameters is None: cur.execute(sql_text)
    else: cur.execute(sql_text, sql_parameters)
    results = cur.fetchall()
    conn.close()
    return results

def GetNearestTurbine(lat, lng):
    """
    Get nearest optimal wind turbine site to specified point
    """

    sites = postgisGetResultsAsDict("""
    SELECT 
    id,
    ST_X(centre) turbinelng,
    ST_Y(centre) turbinelat,
    ST_Distance(ST_Transform(ST_SetSRID(ST_MakePoint(%s, %s), 4326), 3857), ST_Transform(centre, 3857)) distance, 
    ST_Area(ST_Transform(geometry, 3857)) area 
    FROM backend_site 
    ORDER BY distance LIMIT 50;
    """, (AsIs(lng), AsIs(lat), ))
    if len(sites) == 0: return None

    largestarea, largestindex, num_to_check = None, 0, 5
    sites = sites[0:num_to_check]
    for i in range(num_to_check):
        site = sites[i]
        area_square_meters = site['area']
        if ((largestarea is None) or (area_square_meters > largestarea)):
            largestindex = i
            largestarea = area_square_meters

    site = sites[largestindex]

    site['currentlng'] = lng
    site['currentlat'] = lat
    site['turbinelng'] = site['turbinelng']
    site['turbinelat'] = site['turbinelat']
    site['distance_mi'] = (site['distance'] * 0.621371) / 1000
    site['distance_km'] = site['distance'] / 1000
    site['distance_m'] = site['distance']

    return site


lng, lat = 0, 50.82899176802492
site = GetNearestTurbine(lat, lng)
print(json.dumps(site, indent=4))

