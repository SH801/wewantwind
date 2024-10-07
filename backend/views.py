import os
from docx import Document
import sys
import docx
import json
import requests
import shutil
import uuid
import urllib
import geojson
import subprocess
from turfpy.transformation import intersect
from turfpy.measurement import points_within_polygon
from geojson import Point as GeoJSONPoint, Feature, FeatureCollection, Polygon
from urllib.parse import urlparse
from PIL import Image, ImageEnhance
from matplotlib import colors
from pprint import pprint
from ipware import get_client_ip
from docx.shared import Cm, Pt, RGBColor
from docx.enum.style import WD_STYLE_TYPE
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.units import cm, inch
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from django.http import HttpResponse, HttpResponseNotFound
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import Distance as RadiusDistance
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder
from django.template.loader import render_to_string, get_template
from django.core.mail import EmailMessage
from django.contrib.gis.geos import Point
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.sites.shortcuts import get_current_site
from django.utils.encoding import force_bytes
from django.db.models import Q, Count
from time import sleep
from random import randrange
from itertools import islice

from .models import Site, Vote, Message, Boundary, EventLog

# Create your views here.

COORDINATE_PRECISION = 5
LOCAL_DISTANCE = 10 # miles

RESTART_SCRIPT = os.environ.get("RESTART_SCRIPT")
GOOGLE_RECAPTCHA_SECRET_KEY = os.environ.get("GOOGLE_RECAPTCHA_SECRET_KEY")

cwd = os.path.dirname(os.path.realpath(__file__))

constraintslist = [
    {
        'heading': 'All constraints',
        'datasets': [
            'Inadequate wind speed',
            'Landscape and visual impact',
            'Heritage impacts',
            'Separation distance to residential properties',
            'Ecology and wildlife',
            'Other technical constraints',
            'Aviation and exclusion areas'
        ],
        'layers': [
            {'name': 'wind', 'color': 'blue'},
            {'name': 'landscape_and_visual_impact', 'color': 'chartreuse'},
            {'name': 'heritage_impacts', 'color': 'darkgoldenrod'},
            {'name': 'separation_distance_to_residential', 'color': 'darkorange'},
            {'name': 'ecology_and_wildlife', 'color': 'darkgreen'},
            {'name': 'other_technical_constraints_hi', 'color': 'red'},
            {'name': 'aviation_and_exclusion_areas', 'color': 'purple'}
        ]
    },
    {
        'heading': 'Inadequate wind speed', 
        'datasets': [
            'Inadequate wind speed (< 5 metres per second) from NOABL wind speed database'
        ],
        'layers': [
            {'name': 'wind', 'color': 'blue'}
        ]
    },
    {
        'heading': 'Landscape and visual impact', 
        'datasets': [
            'National Parks', 
            'Areas of Outstanding Natural Beauty / National Scenic Areas', 
            'Heritage Coasts'
        ],
        'layers': [
            {'name': 'landscape_and_visual_impact', 'color': 'chartreuse'}
        ]
    },
    {
        'heading': 'Heritage impacts', 
        'datasets': [
            'Listed buildings',
            'Conservation areas',
            'World Heritage Sites',
            'Scheduled Ancient Monuments',
            'Registered parks and gardens',
            'Registered historic battlefields'
        ],
        'layers': [
            {'name': 'heritage_impacts', 'color': 'darkgoldenrod'}
        ]
    },
    {
        'heading': 'Separation distance to residential properties', 
        'datasets': [
            '400 metre buffer from residential areas'
        ],
        'layers': [
            {'name': 'separation_distance_to_residential', 'color': 'darkorange'}
        ]
    },
    {
        'heading': 'Ecology and wildlife', 
        'datasets': [
            'Sites of Special Scientific Interest / Areas of Special Scientific Interest',
            'Ramsar sites',
            'Special Areas of Conservation',
            'Special Protection Areas',
            'National nature reserves',
            'Ancient woodland',
            'Local wildlife reserves',
            '50 metre buffer from hedgerows'
        ],
        'layers': [
            {'name': 'ecology_and_wildlife', 'color': 'darkgreen'}
        ]
    },
    {
        'heading': 'Other technical constraints', 
        'datasets': [
            '150 metre buffer from public roads (A and B roads and motorways)',
            '150 metre buffer from railway lines',
            '150 metre buffer from inland waters',
            '150 metre buffer from pipelines',
            '150 metre buffer from power lines',
            '150 metre buffer from public footpaths',
            '200 metre buffer from bridleways',     
        ],
        'layers': [
            {'name': 'other_technical_constraints_hi', 'color': 'red'}
        ]
    },
    {
        'heading': 'Aviation and exclusion areas', 
        'datasets': [
            'Civilian airports',
            'Aerodromes',
            'Military airfields and airbases',
            'MOD training areas',
            'Explosive safeguarded areas, danger areas near ranges',
            'MOD exclusion areas'
        ],
        'layers': [
            {'name': 'aviation_and_exclusion_areas', 'color': 'purple'}
        ]
    }
]


def OutputJson(json_array={'result': 'failure'}):
    json_data = json.dumps(json_array, cls=DjangoJSONEncoder, indent=2)
    return HttpResponse(json_data, content_type="text/json")

def OutputError():
    return OutputJson()

def SendErrorEmail(messagecontent):
    """
    Send message to sysadmin in event of error
    """
    message = EmailMessage("wewantwind.org - Error message", messagecontent, from_email="info@wewantwind.org", to=[os.environ.get("ERROR_EMAIL")])
    message.send()

def home(request):
    """
    Shows default home page or other frontend-specific pages to be rendered by frontend React app
    """
    return render(request, 'index.html')

def GetRandomPointInBounds():
    bounds = [
        [
            -4.9,
            50
        ],
        [
            1.5, 
            57 
        ]
    ]

    xmin, ymin, xmax, ymax = bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]
    xrandom = float(randrange(int(xmin * 100), int(xmax * 100), 1) / 100)
    yrandom = float(randrange(int(ymin * 100), int(ymax * 100), 1) / 100)
    return [xrandom, yrandom]

def CheckInBoundary(point):
    """
    Checks whether point within UK using Boundary table which holds UK
    """
    point = Point(float(point[0]), float(point[1]))
    return (Boundary.objects.filter(name='UK Boundary').filter(geometry__intersects=point).count() != 0)

@csrf_exempt
def GetRandomPoint(request):
    """
    Get random point within UK
    """

    while True:
        point = GetRandomPointInBounds()
        inboundary = CheckInBoundary(point)
        if inboundary is False:
            pass 
            # print("Point not within UK", point)
        else: return OutputJson({'lng': point[0], 'lat': point[1]})


def GetNearestTurbine(lat, lng):
    """
    Get nearest optimal wind turbine site to specified point
    """

    centre = Point(lng, lat, srid=4326)    
    firstcutsize = 50
    sites = Site.objects.all().annotate(centredistance=Distance('centre' , centre )).order_by('centredistance')[:firstcutsize].annotate(distance=Distance('geometry' , centre))
    if sites is None: return None

    firstcut = {}
    for site in sites: firstcut[site.distance] = site
    sortedfirstcut = dict(sorted(firstcut.items()))

    largestarea = None
    largestindex = 0
    num_to_check = 5
    sites = list(islice(sortedfirstcut.items(), num_to_check))
    # print(sites)
    for i in range(num_to_check):
        site = sites[i][1]
        area_square_meters = site.geometry.area
        # print(i, site.centre, int(100000 * area_square_meters))
        # print(area_square_meters)
        if ((largestarea is None) or (area_square_meters > largestarea)):
            largestindex = i
            largestarea = area_square_meters

    # print("largestindex", largestindex)
    site = sites[largestindex][1]
    return site

@csrf_exempt
def NearestTurbine(request):
    """
    Get nearest turbine to supplied point
    """

    try:
        latlng = json.loads(request.body)
    except ValueError:
        return OutputError()

    # lng, lat = -0.147562, 50.8289154

    site = GetNearestTurbine(latlng['lat'], latlng['lng'])
    if site is None: return OutputError()

    results = {}
    results['currentlng'] = latlng['lng']
    results['currentlat'] = latlng['lat']
    results['turbinelat'] = site.centre.coords[1]
    results['turbinelng'] = site.centre.coords[0]
    results['distance_mi'] = site.distance.mi
    results['distance_km'] = site.distance.km
    results['distance_m'] = site.distance.m

    ip, is_routable = get_client_ip(request)
    eventlog = EventLog(name='NearestTurbine', content=json.dumps(results, indent=2), ip=ip)
    eventlog.save()

    return OutputJson(results)

@csrf_exempt
def CheckRenderer(request):
    if request.user.is_authenticated is False:
        return OutputJson({'error': 'You need to be logged in'})
    while True:
        coordinates = GetRandomPointInBounds()
        inboundary = CheckInBoundary(coordinates)
        if inboundary is True: break

    threedimensionsparameters = {'width': '600', 'height': '600', 'ratio': '3', 'zoom': '15', 'pitch': '45', 'bearing': '0', 'center': str(coordinates[0]) + ',' + str(coordinates[1])}
    with open(cwd + '/styles/3d.json', encoding='utf-8') as fp: threedimensions = json.load(fp)
    threedimensions['style']['sources']['customgeojson'] = {
        "type": "geojson",
        "data": {"type": "FeatureCollection", "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coordinates
            }
    }]}}
    for key in threedimensionsparameters: threedimensions[key] = threedimensionsparameters[key]
    try:
        r = requests.post('http://localhost:81/render', json=threedimensions, stream=True)
        if r.status_code == 200:
            return HttpResponse(r.raw, content_type="image/png")        
        else:
            return OutputJson(r)
    except requests.exceptions.ConnectionError:
        return OutputJson({'error': 'Unable to connect to tilerenderer server'})

@csrf_exempt
def CheckRestartRenderer(request):
    while True:
        coordinates = GetRandomPointInBounds()
        inboundary = CheckInBoundary(coordinates)
        if inboundary is True: break
    threedimensionsparameters = {'width': '5', 'height': '5', 'ratio': '1', 'zoom': '15', 'pitch': '45', 'bearing': '0', 'center': str(coordinates[0]) + ',' + str(coordinates[1])}
    with open(cwd + '/styles/3d.json', encoding='utf-8') as fp: threedimensions = json.load(fp)
    threedimensions['style']['sources']['customgeojson'] = {
        "type": "geojson",
        "data": {"type": "FeatureCollection", "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coordinates
            }
    }]}}
    for key in threedimensionsparameters: threedimensions[key] = threedimensionsparameters[key]
    try:
        r = requests.post('http://localhost:81/render', json=threedimensions, stream=True)
        if r.status_code == 200:
            return HttpResponse(r.raw, content_type="image/png")        
        else:
            return OutputJson(r)
    except requests.exceptions.ConnectionError:
        SendErrorEmail("Failed to load tilerenderer so restarting")
        sys.stdout.reconfigure(encoding='utf-8')
        shelloutput = subprocess.run(RESTART_SCRIPT, encoding="utf8", capture_output=True, text=True, universal_newlines=True) 
        return OutputJson({'result': shelloutput.stderr})

@csrf_exempt
def RestartRenderer(request):
    if request.user.is_authenticated is False:
        return OutputJson({'error': 'You need to be logged in'})

    sys.stdout.reconfigure(encoding='utf-8')
    shelloutput = subprocess.run(RESTART_SCRIPT, encoding="utf8", capture_output=True, text=True, universal_newlines=True) 
    return OutputJson({'result': shelloutput.stderr})

def processimages(id, coordinates, constraintslist, parameters):
    with open(cwd + '/styles/planningconstraint.json', encoding='utf-8') as fp: planningconstraint = json.load(fp)
    with open(cwd + '/styles/planningconstraints_osmstyle.json', encoding='utf-8') as fp: planningconstraints = json.load(fp)
    # with open(cwd + '/styles/planningconstraints.json', encoding='utf-8') as fp: planningconstraints = json.load(fp)

    imagedirectory = cwd + '/downloads/' + id
    os.mkdir(imagedirectory) 

    threedimensionsparameters = {'width': '600', 'height': '600', 'ratio': '3', 'zoom': '15', 'pitch': '45', 'bearing': '0', 'center': str(coordinates[0]) + ',' + str(coordinates[1])}

    with open(cwd + '/styles/3d.json', encoding='utf-8') as fp: threedimensions = json.load(fp)
    threedimensions['style']['sources']['customgeojson'] = {
        "type": "geojson",
        "data": {"type": "FeatureCollection", "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coordinates
            }
    }]}}
    for key in threedimensionsparameters: threedimensions[key] = threedimensionsparameters[key]

    try:
        r = requests.post('http://localhost:81/render', json=threedimensions, stream=True)
        if r.status_code == 200:
            imagepath = imagedirectory + '/3d.png'
            with open(imagepath, 'wb') as f:
                r.raw.decode_content = True
                shutil.copyfileobj(r.raw, f)
    except requests.exceptions.ConnectionError:
        SendErrorEmail("Couldn't connect to tilerenderer server")

    windturbine = Image.open(cwd + "/windturbine_bright.png")
    windturbinescale = 0.4
    windturbine = windturbine.resize((int(windturbinescale * windturbine.size[0]), int(windturbinescale * windturbine.size[1])), Image.Resampling.LANCZOS)
    background = Image.open(imagepath)
    contrast = ImageEnhance.Contrast(background)
    brightness = ImageEnhance.Brightness(contrast.enhance(0.8))
    brightness.enhance(1.2).save(imagepath)    
    background = Image.open(imagepath)
    background.paste(windturbine, (int((int(threedimensionsparameters['width']) * 3 / 2) - (windturbine.size[0] / 2)), int(int(threedimensionsparameters['height']) * 3 / 2) - windturbine.size[1]), windturbine)

    background.save(imagepath)

    # Modify planningconstraint template according to constraint color and duplicating for each listed layer
    for constraint in constraintslist:
        # print(constraint['heading'])
        alllayers = []
        constraintlayers = json.loads(json.dumps(planningconstraint))
        for layer in constraint['layers']:
            for constraintlayer in constraintlayers:
                newconstraintlayer = json.loads(json.dumps(constraintlayer))
                newconstraintlayer['id'] = layer['name'] + "_" + newconstraintlayer['id']
                newconstraintlayer['source-layer'] = layer['name']
                if 'fill-color' in newconstraintlayer['paint']: newconstraintlayer['paint']['fill-color'] = layer['color']
                alllayers.append(newconstraintlayer)

        # Insert new layers into existing stylesheet template
        newlayers = []
        newplanningconstraints = json.loads(json.dumps(planningconstraints))
        for newplanningconstraintlayer in newplanningconstraints['style']['layers']:
            if newplanningconstraintlayer['id'] == 'planningconstraints':
                for layer in alllayers:
                    newlayers.append(layer)
            else: 
                newlayers.append(newplanningconstraintlayer)

        if 'customgeojson' in newplanningconstraints['style']['sources']:
            newplanningconstraints['style']['sources']['customgeojson'] = {
                "type": "geojson",
                "data": {"type": "FeatureCollection", "features": [{
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": coordinates
                    }
                }]}
            }      

        newplanningconstraints['style']['layers'] = newlayers
        for key in parameters: newplanningconstraints[key] = parameters[key]

        foreground = Image.open(cwd + "/scale.png")
        # For some reason the meticulously sized scale doesn't seem to fit to the correct image size
        # Possibly some quirk with the map renderer so need to scale 'by hand'!
        scalescale = 1.5
        foreground = foreground.resize((int(scalescale * foreground.size[0]), int(scalescale * foreground.size[1])), Image.Resampling.LANCZOS)
        # pprint(newplanningconstraints, indent=4)
        r = requests.post('http://localhost:81/render', json=newplanningconstraints, stream=True)
        if r.status_code == 200:
            imagepath = imagedirectory + "/" + constraint['heading'] + '.png'
            with open(imagepath, 'wb') as f:
                r.raw.decode_content = True
                shutil.copyfileobj(r.raw, f) 
            background = Image.open(imagepath)
            background.paste(foreground, ((600 * 3) - foreground.size[0], (500 * 3) - foreground.size[1]), foreground)
            background.save(imagedirectory + "/" + constraint['heading'] + '.png')

    return imagedirectory

def add_hyperlink(paragraph, text, url):
    # This gets access to the document.xml.rels file and gets a new relation id value
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)

    # Create the w:hyperlink tag and add needed values
    hyperlink = docx.oxml.shared.OxmlElement('w:hyperlink')
    hyperlink.set(docx.oxml.shared.qn('r:id'), r_id, )

    # Create a new run object (a wrapper over a 'w:r' element)
    new_run = docx.text.run.Run(
        docx.oxml.shared.OxmlElement('w:r'), paragraph)
    new_run.text = text

    # Set the run's style to the builtin hyperlink style, defining it if necessary
    new_run.style = get_or_create_hyperlink_style(part.document)
    # Alternatively, set the run's formatting explicitly
    # new_run.font.color.rgb = docx.shared.RGBColor(0, 0, 255)
    # new_run.font.underline = True

    # Join all the xml elements together
    hyperlink.append(new_run._element)
    paragraph._p.append(hyperlink)
    return hyperlink

#This is only needed if you're using the builtin style above
def get_or_create_hyperlink_style(d):
    """If this document had no hyperlinks so far, the builtin
       Hyperlink style will likely be missing and we need to add it.
       There's no predefined value, different Word versions
       define it differently.
       This version is how Word 2019 defines it in the
       default theme, excluding a theme reference.
    """
    if "Hyperlink" not in d.styles:
        if "Default Character Font" not in d.styles:
            ds = d.styles.add_style("Default Character Font",
                                    docx.enum.style.WD_STYLE_TYPE.CHARACTER,
                                    True)
            ds.element.set(docx.oxml.shared.qn('w:default'), "1")
            ds.priority = 1
            ds.hidden = True
            ds.unhide_when_used = True
            del ds
        hs = d.styles.add_style("Hyperlink",
                                docx.enum.style.WD_STYLE_TYPE.CHARACTER,
                                True)
        hs.base_style = d.styles["Default Character Font"]
        hs.unhide_when_used = True
        hs.font.color.rgb = docx.shared.RGBColor(0x05, 0x63, 0xC1)
        hs.font.underline = True
        del hs

    return "Hyperlink"


def createworddoc(wordpath, readableposition, imagedirectory):
    """
    Creates word document containing constraints images downloaded to 'imagedirectory'
    """

    document = Document()
    sections = document.sections
    for section in sections:
        margin = 1
        section.left_margin = Cm(margin)
        section.right_margin = Cm(margin)
        section.top_margin = Cm(margin)
        section.bottom_margin = Cm(margin)

    style = document.styles['Normal']
    font = style.font
    font.name = 'Open Sans Light'
    font.size = Pt(11)
    styles = document.styles
    style = styles.add_style('Attribution', WD_STYLE_TYPE.PARAGRAPH)
    font = style.font
    font.name = 'Open Sans Light'
    font.size = Pt(9)
    style = document.styles['Heading 1']
    font = style.font
    font.name = 'Open Sans ExtraBold'
    font.size = Pt(25)
    style = document.styles['Heading 2']
    font = style.font
    font.name = 'Open Sans ExtraBold'
    font.size = Pt(15)
    style = document.styles['Heading 3']
    font = style.font
    font.name = 'Open Sans Light'
    font.size = Pt(15)
    style = document.styles['List Bullet']
    font = style.font
    font.name = 'Open Sans ExtraBold'
    style = document.styles['List Bullet 2']
    style.left_margin = Cm(0)
    font = style.font
    font.name = 'Open Sans Light'

    p = document.add_paragraph(style='Heading 1')
    p.paragraph_format.space_before = Pt(0)
    run = p.add_run('wewantwind.org Turbine Siting Report')
    run.font.color.rgb = RGBColor.from_string('000000')
    p = document.add_paragraph(style='Heading 3')
    p.paragraph_format.space_before = Pt(0)
    run = p.add_run('Position: ' + readableposition)
    p.paragraph_format.space_after = Pt(30)
    run.font.color.rgb = RGBColor.from_string('000000')

    image = imagedirectory + '/3d.png'
    document.add_picture(image, width=Cm(19))
    p = document.add_paragraph(style='Attribution')
    run = p.add_run('Satellite images © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community, ESRI')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    document.add_page_break()

    p = document.add_paragraph('Below is a summary of all wind turbine planning constraints used to create your optimal wind turbine site.')

    lastcontraint = constraintslist[-1]
    for constraint in constraintslist:
        p = document.add_paragraph(style='Heading 2')
        run = p.add_run(constraint['heading'])
        run.font.color.rgb = RGBColor.from_string('000000')

        paragraph = document.add_paragraph('Constraints shown in this section:')
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(0)
        index = 0
        for dataset in constraint['datasets']:
            if constraint == constraintslist[0]: p = document.add_paragraph(style='List Bullet')
            else: p = document.add_paragraph(style='List Bullet 2')
            run = p.add_run(dataset)
            if constraint == constraintslist[0]:
                color = constraint['layers'][0]['color']
                if len(constraint['layers']) > 0: color = constraint['layers'][index]['color']
                rgbarray = colors.to_rgb(color)
                run.font.color.rgb = RGBColor(int(255 * rgbarray[0]), int(255 * rgbarray[1]), int(255 * rgbarray[2]))
            index += 1

        image = imagedirectory + '/' + constraint['heading'] + '.png'
        document.add_picture(image, width=Cm(19))
        p = document.add_paragraph(style='Attribution')
        run = p.add_run('Constraints data from multiple sources and copyright of respective data providers - for full list, go to ')
        add_hyperlink(p, 'ckan.wewantwind.org', "https://ckan.wewantwind.org")
        run.font.color.rgb = RGBColor.from_string('000000')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p = document.add_paragraph(style='Attribution')
        run = p.add_run(" © ")
        add_hyperlink(p, 'OpenMapTiles', "https://www.openmaptiles.org")
        run = p.add_run(" © ")
        add_hyperlink(p, 'OpenStreetMap ', "https://www.openstreetmap.org/copyright")
        run = p.add_run("contributors")
        run.font.color.rgb = RGBColor.from_string('000000')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)

        if constraint != lastcontraint:
            document.add_page_break()

    document.save(wordpath)

def createpdfdoc(pdfpath, readableposition, imagedirectory):
    """
    Creates pdf document containing constraints images downloaded to 'imagedirectory'
    """

    canvas = Canvas(pdfpath, pagesize=A4)
    canvas.setTitle("wewantwind.org Turbine Siting Report - " + readableposition)

    pdfmetrics.registerFont(TTFont('OpenSansLt', cwd + '/Open_Sans/static/OpenSans-Light.ttf'))
    pdfmetrics.registerFont(TTFont('OpenSans', cwd + '/Open_Sans/static/OpenSans-Medium.ttf'))
    pdfmetrics.registerFont(TTFont('OpenSansBd', cwd + '/Open_Sans/static/OpenSans-SemiBold.ttf'))
    pdfmetrics.registerFont(TTFont('OpenSansExtraBd', cwd + '/Open_Sans/static/OpenSans-ExtraBold.ttf'))

    canvas.setFont("OpenSansExtraBd", 25) #choose your font type and font size
    canvas.drawString(40, 11*72, "wewantwind.org Turbine Siting Report")
    canvas.setFont("OpenSansLt", 23) #choose your font type and font size
    canvas.drawString(40, 10.5*72, "Position: " + readableposition)

    image = imagedirectory + '/3d.png'
    canvas.drawInlineImage(image, 40 , 155, width=72*7,height=int(600 * 420 / 500))
    canvas.setFont("OpenSansLt", 8) #choose your font type and font size
    canvas.drawString(40, 142, 'Satellite images © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP,')
    canvas.drawString(40, 130, 'and the GIS User Community, ESRI')
    canvas.showPage()

    lastcontraint = constraintslist[-1]
    for constraint in constraintslist:
        canvas.setFont("OpenSansExtraBd", 25) #choose your font type and font size
        canvas.drawString(40, 11*72, "wewantwind.org Turbine Siting Report")
        canvas.setFont("OpenSansLt", 23) #choose your font type and font size
        canvas.drawString(40, 10.5*72, "Position: " + readableposition)
        canvas.setFont("OpenSansExtraBd", 15) #choose your font type and font size
        canvas.drawString(40, 9.8*72, constraint['heading'])
        canvas.setFont("OpenSansLt", 11) #choose your font type and font size
        vpos = 9.5*72
        canvas.drawString(40, vpos, "Constraints shown in this section:")
        index = 0
        for dataset in constraint['datasets']:
            canvas.setFont("OpenSansLt", 11)
            canvas.setFillColorRGB(0,0,0)
            vpos -= 16
            if constraint == constraintslist[0]:
                canvas.setFont("OpenSansExtraBd", 11)
                color = constraint['layers'][0]['color']
                if len(constraint['layers']) > 0: color = constraint['layers'][index]['color']
                rgbarray = colors.to_rgb(color)
                canvas.setFillColorRGB(rgbarray[0], rgbarray[1], rgbarray[2])
            index += 1
            canvas.drawString(40, vpos, "• " + dataset)

        image = imagedirectory + '/' + constraint['heading'] + '.png'
        canvas.drawInlineImage(image, 40 , vpos - (48 * 7) - 100, width=72*7,height=420)
        canvas.setFont("OpenSansLt", 8)
        canvas.setFillColorRGB(0,0,0)
        canvas.drawString(40, vpos - (48 * 7) - 112, 'Constraints data from multiple sources and copyright of respective data providers - for full list, go to https://ckan.wewantwind.org')
        canvas.drawString(40, vpos - (48 * 7) - 124, '© OpenMapTiles https://www.openmaptiles.org © OpenStreetMap contributors https://www.openstreetmap.org/copyright')

        if constraint != lastcontraint:
            canvas.showPage()

    canvas.save()

def GetReport(type, lat, lng):
    """
    Return report object for specific type, lat, lng
    """

    id = str(uuid.uuid4())
    lat, lng = round(lat, COORDINATE_PRECISION), round(lng, COORDINATE_PRECISION)
    filestem = str(lat) + "_" + str(lng)
    readableposition = str(lat) + "°N, " + str(lng) + "°E"
    downloadsdirectory = cwd + '/downloads/'
    pdfpath = downloadsdirectory + filestem + '.pdf'
    wordpath = downloadsdirectory + filestem + '.docx'
    # if True:
    if (os.path.isfile(wordpath) is False) or (os.path.isfile(pdfpath) is False):
        imagedirectory = processimages(id, [lng, lat], constraintslist, {'width': '600', 'height': '500', 'ratio': '3', 'zoom': '12', 'center': str(lng) + ',' + str(lat)})
        if os.path.isfile(wordpath) is False: createworddoc(wordpath, readableposition, imagedirectory)
        if os.path.isfile(pdfpath) is False: createpdfdoc(pdfpath, readableposition, imagedirectory)
        shutil.rmtree(imagedirectory)

    returnfile = wordpath
    filestem = "wewantwind.org Report - " + readableposition
    mimetype = 'application/msword'
    filename = filestem + ".docx"
    if type == 'pdf': 
        returnfile = pdfpath
        mimetype = 'application/pdf'
        filename = filestem + ".pdf"

    try:    
        with open(returnfile, 'rb') as f:
           file_data = f.read()
        response = HttpResponse(file_data, content_type=mimetype)
        response['Content-Disposition'] = 'attachment; filename="' + filename + '"'

    except IOError:
        # handle file not exist case here
        response = HttpResponseNotFound('<h1>File does not exist</h1>')

    return response

@csrf_exempt
def SiteReport(request):
    """
    Return site report as docs or pdf
    """

    type = request.GET.get('type','word')
    lat = float(request.GET.get('lat', 51))
    lng = float(request.GET.get('lng',0))

    return GetReport(type, lat, lng)

@csrf_exempt
def NearestTurbineReport(request):
    type = request.GET.get('type','word')
    lat = float(request.GET.get('lat', 51))
    lng = float(request.GET.get('lng',0))
    site = GetNearestTurbine(lat, lng)
 
    return GetReport(type, site.centre.coords[1], site.centre.coords[0])

@csrf_exempt
def CreateGeoJSON(request):
    lat = float(request.GET.get('lat', 0))
    lng = float(request.GET.get('lng',0))
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
            "type": "Feature",
            "name": "wewantwind.org Turbine",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
        }]
    }

    return OutputJson(geojson)

@csrf_exempt
def CastVote(request):
    """
    Cast provisional vote and sent email requesting vote confirmation
    """

    try:
        parameters = json.loads(request.body)
    except ValueError:
        return OutputError()

    ''' Begin reCAPTCHA validation '''

    recaptcha_response = parameters['recaptcha']
    url = 'https://www.google.com/recaptcha/api/siteverify'
    values = {
        'secret': GOOGLE_RECAPTCHA_SECRET_KEY,
        'response': recaptcha_response
    }
    recaptchadata = urllib.parse.urlencode(values).encode()
    req =  urllib.request.Request(url, data=recaptchadata)
    response = urllib.request.urlopen(req)
    result = json.loads(response.read().decode())

    ''' End reCAPTCHA validation '''
    ip, is_routable = get_client_ip(request)

    if result['success']:
        token = uuid.uuid4().hex
        # Save vote in database
        provisionalvote = Vote( \
            name=parameters['name'], \
            email=parameters['email'].lower(), \
            contactable=parameters['contactable'], \
            userlocation=Point(parameters['userlocation']['lng'], parameters['userlocation']['lat']), \
            site=Point(parameters['site']['lng'], parameters['site']['lat']), \
            ip=ip, \
            token=token)
        provisionalvote.save()
        # Attempt to send email
        from_email = '"wewantwind.org" <info@wewantwind.org>'
        subject = "wewantwind.org: Confirm your wind turbine vote"
        current_site = get_current_site(request)
        parameters['domain'] = current_site.domain
        parameters['uid'] = urlsafe_base64_encode(force_bytes(provisionalvote.pk))
        parameters['token'] = token
        parameters['site'] = {'lat': round(parameters['site']['lat'], COORDINATE_PRECISION), 'lng': round(parameters['site']['lng'], COORDINATE_PRECISION)}
        message = render_to_string('backend/confirm_vote.html', parameters)        
        message = EmailMessage(subject, message, from_email=from_email, to=[parameters['email']])
        message.send()
    return OutputJson({'result': 'success'})

@csrf_exempt
def ConfirmVote(request, uidb64, token):
    """
    Confirm vote using link sent via email
    """

    sleep(0.5)

    try:
        id = urlsafe_base64_decode(uidb64).decode()
        provisionalvote = Vote.objects.get(pk=id)
    except (TypeError, ValueError, OverflowError, Vote.DoesNotExist):
        provisionalvote = None

    if (provisionalvote is not None) and (provisionalvote.token == token) and (provisionalvote.confirmed == False):
        Vote.objects.filter(email=provisionalvote.email).filter(~Q(pk=id)).delete()
        provisionalvote.confirmed = True
        provisionalvote.save()
        return render(request, 'backend/vote_confirmed.html')
    else:
        return render(request, 'backend/vote_not_confirmed.html')

@csrf_exempt
def Votes(request):
    """
    Get data on all votes
    """

    distinctpoints = Vote.objects.filter(confirmed=True).values('site').annotate(Count('id')).order_by()

    features = []
    for distinctpoint in distinctpoints:
        # print(distinctpoint, distinctpoint['site'].coords)
        allvotes = Vote.objects.filter(confirmed=True).filter(site=distinctpoint['site']).count()
        onemilevotes = Vote.objects.filter(confirmed=True).filter(site=distinctpoint['site']).filter(userlocation__distance_lte=(distinctpoint['site'], RadiusDistance(mi=1))).count()
        fivemilevotes = Vote.objects.filter(confirmed=True).filter(site=distinctpoint['site']).filter(userlocation__distance_lte=(distinctpoint['site'], RadiusDistance(mi=5))).count()
        tenmilevotes = Vote.objects.filter(confirmed=True).filter(site=distinctpoint['site']).filter(userlocation__distance_lte=(distinctpoint['site'], RadiusDistance(mi=10))).count()
        feature = {
            "type": "feature",
            "properties": {
                'name': 'Site votes', 
                'subtype': 'votes',
                'position': str(round(distinctpoint['site'].coords[1], COORDINATE_PRECISION)) + "°N, " + str(round(distinctpoint['site'].coords[0], COORDINATE_PRECISION)) + "°E",
                'votes': allvotes,
                'lat': distinctpoint['site'].coords[1],
                'lng': distinctpoint['site'].coords[0],
                'votes:within:1:mile': onemilevotes,
                'votes:within:5:miles': fivemilevotes,
                'votes:within:10:miles': tenmilevotes
            },
            "geometry": {
                "type": "Point",
                "coordinates": [distinctpoint['site'].coords[0], distinctpoint['site'].coords[1]]
            }
        }
        features.append(feature)

    geojson = { "type": "FeatureCollection", "features": features }
    return OutputJson(geojson)

@csrf_exempt
def LocalPeople(request):
    """
    Get number of local people within a predefined distance of supplied position
    """

    try:
        parameters = json.loads(request.body)
    except ValueError:
        return OutputError()
    
    centre = Point(parameters['lng'], parameters['lat'], srid=4326)    
    localpeople = Vote.objects.filter(confirmed=True, contactable=True, userlocation__distance_lte=(centre, RadiusDistance(mi=LOCAL_DISTANCE)))
    localpeoplecount = 0
    if localpeople is not None: localpeoplecount = len(localpeople)
    return OutputJson({'localpeople': localpeoplecount})

@csrf_exempt
def SendMessage(request):
    """
    Create provisional message entry
    """

    try:
        parameters = json.loads(request.body)
    except ValueError:
        return OutputError()

    ''' Begin reCAPTCHA validation '''

    recaptcha_response = parameters['recaptcha']
    url = 'https://www.google.com/recaptcha/api/siteverify'
    values = {
        'secret': GOOGLE_RECAPTCHA_SECRET_KEY,
        'response': recaptcha_response
    }
    recaptchadata = urllib.parse.urlencode(values).encode()
    req =  urllib.request.Request(url, data=recaptchadata)
    response = urllib.request.urlopen(req)
    result = json.loads(response.read().decode())

    ''' End reCAPTCHA validation '''
    ip, is_routable = get_client_ip(request)

    if result['success']:
        token = uuid.uuid4().hex
        # Save vote in database
        provisionalmessage = Message( \
            name=parameters['name'], \
            email=parameters['email'].lower(), \
            userlocation=Point(parameters['userlocation']['lng'], parameters['userlocation']['lat']), \
            ip=ip, \
            token=token)
        provisionalmessage.save()
        # Attempt to send email
        from_email = '"wewantwind.org" <info@wewantwind.org>'
        subject = "wewantwind.org: Confirm your message request"
        current_site = get_current_site(request)
        parameters['domain'] = current_site.domain
        parameters['uid'] = urlsafe_base64_encode(force_bytes(provisionalmessage.pk))
        parameters['token'] = token
        parameters['localdistance'] = LOCAL_DISTANCE
        message = render_to_string('backend/confirm_message.html', parameters)        
        message = EmailMessage(subject, message, from_email=from_email, to=[parameters['email']])
        message.send()
    return OutputJson({'result': 'success'})

@csrf_exempt
def SendShare(request):
    """
    Send shareable link to email
    """

    try:
        parameters = json.loads(request.body)
    except ValueError:
        return OutputError()

    ''' Begin reCAPTCHA validation '''

    recaptcha_response = parameters['recaptcha']
    url = 'https://www.google.com/recaptcha/api/siteverify'
    values = {
        'secret': GOOGLE_RECAPTCHA_SECRET_KEY,
        'response': recaptcha_response
    }
    recaptchadata = urllib.parse.urlencode(values).encode()
    req =  urllib.request.Request(url, data=recaptchadata)
    response = urllib.request.urlopen(req)
    result = json.loads(response.read().decode())

    ''' End reCAPTCHA validation '''
    ip, is_routable = get_client_ip(request)

    if result['success']:
        # Attempt to send email
        from_email = '"wewantwind.org" <info@wewantwind.org>'
        subject = "wewantwind.org: Someone has shared a wind turbine site link with you"
        current_site = get_current_site(request)
        parameters['domain'] = current_site.domain
        message = render_to_string('backend/share.html', parameters)        
        message = EmailMessage(subject, message, from_email=from_email, to=[parameters['email']])
        message.send()
    return OutputJson({'result': 'success'})

@csrf_exempt
def ProcessMessageQueue(request):
    """
    Process message queue
    Run this once a day - around 8am - to prevent users getting deluged with emails
    """

    current_site = get_current_site(request)
    from_email = '"wewantwind.org" <info@wewantwind.org>'
    subject = "wewantwind.org: Introductory email from user(s) wanting to connect with other users"
    pendingmessages = Message.objects.filter(sent=False)
    outboundqueue = {}
    for pendingmessage in pendingmessages:
        print("Sending message from", pendingmessage.name, pendingmessage.ip)
        parameters = {\
            'domain': current_site.domain, \
            'sourcename': pendingmessage.name, \
            'sourceemail': pendingmessage.email \
        }
        localpeople = Vote.objects.filter(~Q(email=pendingmessage.email)).filter(confirmed=True, contactable=True, userlocation__distance_lte=(pendingmessage.userlocation, RadiusDistance(mi=LOCAL_DISTANCE)))
        for localperson in localpeople:
            name, email = localperson.name, localperson.email
            if email not in outboundqueue:
                outboundqueue[email] = {'name': name, 'pk': localperson.pk, 'people': []}
            outboundqueue[email]['people'].append({'name': pendingmessage.name, 'email': pendingmessage.email})

    messagessent = 0
    for email in outboundqueue:
        name = outboundqueue[email]['name']
        peoplelist = ''
        for person in outboundqueue[email]['people']:
            peoplelist += person['name'].strip() + ": " + person['email'].strip() + "\n"
        if peoplelist != '':
            parameters = {'domain': current_site.domain, 'name': name, 'peoplelist': peoplelist}
            parameters['uid'] = urlsafe_base64_encode(force_bytes(outboundqueue[email]['pk']))
            parameters['token'] = uuid.uuid4().hex
            parameters['localdistance'] = LOCAL_DISTANCE
            Vote.objects.filter(pk=outboundqueue[email]['pk']).update(token=parameters['token'])
            message = render_to_string('backend/standard_message.html', parameters)        
            message = EmailMessage(subject, message, from_email=from_email, to=[email])
            message.send()
            messagessent += 1

    # pprint(outboundqueue, indent=4)            
    Message.objects.filter(sent=False).update(sent=True)

    return OutputJson({'result': 'success', 'messagesent': messagessent})

@csrf_exempt
def ConfirmMessage(request, uidb64, token):
    """
    Confirm vote using link sent via email
    """

    sleep(0.5)

    try:
        id = urlsafe_base64_decode(uidb64).decode()
        provisionalmessage = Message.objects.get(pk=id)
    except (TypeError, ValueError, OverflowError, Message.DoesNotExist):
        provisionalmessage = None

    if (provisionalmessage is not None) and (provisionalmessage.token == token) and (provisionalmessage.confirmed == False):
        Message.objects.filter(email=provisionalmessage.email).filter(~Q(pk=id)).delete()
        provisionalmessage.confirmed = True
        provisionalmessage.save()
        return render(request, 'backend/message_confirmed.html')
    else:
        return render(request, 'backend/message_not_confirmed.html')

@csrf_exempt
def RemoveMailingList(request, uidb64, token):
    """
    Remove from mailing list
    """

    sleep(0.5)

    try:
        pk = urlsafe_base64_decode(uidb64).decode()
        provisionalvote = Vote.objects.get(pk=pk)
    except (TypeError, ValueError, OverflowError, Vote.DoesNotExist):
        provisionalvote = None

    if (provisionalvote is not None) and (provisionalvote.token == token) and (provisionalvote.contactable == True):
        Message.objects.filter(email=provisionalvote.email).filter(~Q(pk=pk)).delete()
        provisionalvote.contactable = False
        provisionalvote.save()
        return render(request, 'backend/mailinglist_confirmed.html')
    else:
        return render(request, 'backend/mailinglist_not_confirmed.html')

@csrf_exempt
def Test(request):
    return render(request, 'backend/vote_not_confirmed.html')

