from pyproj import Proj, transform



XMIN = '12875.24103276037203614'
XMAX = '26966.0047221522545442'
YMIN = '6742273.39647486992180347'
YMAX = '6762063.49587729386985302'
CUSTOMGEOJSONID = 'cc12c3e7-0f90-4f67-8b93-f03be121c511'
CUSTOMGEOJSONURL = 'https://positiveplaces.org/customgeojson/' + CUSTOMGEOJSONID

# bottomleft = [XMIN, YMIN]
# topright = [XMAX, YMAX]

# XMIN, YMIN = transform(Proj(init='epsg:4326'), Proj(init='epsg:3857'), bottomleft[0], bottomleft[1])
# XMAX, YMAX = transform(Proj(init='epsg:4326'), Proj(init='epsg:3857'), topright[0], topright[1])

# print(XMIN, YMIN)
# print(XMAX, YMAX)
# exit()

with open('qgis_template_actual.qgs', 'r') as f:
    newdata = f.read()

newdata = newdata.replace(XMIN, "##XMIN##")
newdata = newdata.replace(YMIN, "##YMIN##")
newdata = newdata.replace(XMAX, "##XMAX##")
newdata = newdata.replace(YMAX, "##YMAX##")
newdata = newdata.replace(CUSTOMGEOJSONURL, "##CUSTOMGEOJSONURL##")
newdata = newdata.replace(CUSTOMGEOJSONID, "##CUSTOMGEOJSONID##")

with open('qgis_template_new.qgs', 'w') as f:
    f.write(newdata)
