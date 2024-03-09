

XMIN = '0.1234'
XMAX = '0.2345'
YMIN = '51.6789'
YMAX = '51.7890'
CUSTOMGEOJSONID = 'cc12c3e7-0f90-4f67-8b93-f03be121c511'
CUSTOMGEOJSONURL = 'https://positiveplaces.org/customgeojson/' + CUSTOMGEOJSONID

with open('qgis_template.qgs', 'r') as f:
    newdata = f.read()

newdata = newdata.replace("##XMIN##", XMIN)
newdata = newdata.replace("##XMAX##", XMAX)
newdata = newdata.replace("##YMIN##", YMIN)
newdata = newdata.replace("##YMAX##", YMAX)
newdata = newdata.replace("##CUSTOMGEOJSONID##", CUSTOMGEOJSONID)
newdata = newdata.replace("##CUSTOMGEOJSONURL##", CUSTOMGEOJSONURL)

with open('qgis_template_actual.qgs', 'w') as f:
    f.write(newdata)
