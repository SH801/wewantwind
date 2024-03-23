import { bearing } from '@turf/turf';
import maplibregl from '!maplibre-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import { 
  PLANNING_CONSTRAINTS,
  PAGE,
  DEFAULT_CENTRE 
} from "../constants";

export function mapRefreshPlanningConstraints(showplanningconstraints, planningconstraints, map) {
    var planningconstraints_sections = Object.keys(PLANNING_CONSTRAINTS);
    for(let i = 0; i < planningconstraints_sections.length; i++) {
      var planningconstraint_section = planningconstraints_sections[i];
      var section_status = planningconstraints[planningconstraint_section];
      if (!showplanningconstraints) section_status = false;
      for(let j = 0; j < PLANNING_CONSTRAINTS[planningconstraint_section]['layers'].length; j++) {
        var id = PLANNING_CONSTRAINTS[planningconstraint_section]['layers'][j];
        if (map.getLayer(id)) {
          if (section_status) map.setLayoutProperty(id, 'visibility', 'visible');
          else map.setLayoutProperty(id, 'visibility', 'none');
        }
      }
    }
}

export function mapRefreshWindspeed(showwindspeed, map) {
    if (showwindspeed) map.setLayoutProperty('windspeed', 'visibility', 'visible');
    else map.setLayoutProperty('windspeed', 'visibility', 'none');
}

export function mapRefreshElectricity(showelectricity, map) {
    if (showelectricity) {
        map.setLayoutProperty('grid', 'visibility', 'visible');
        map.setLayoutProperty('grid_outline', 'visibility', 'visible');
        map.setLayoutProperty('grid_substation', 'visibility', 'visible');
        map.setLayoutProperty('grid_label', 'visibility', 'visible');
    } 
    else {
        map.setLayoutProperty('grid', 'visibility', 'none');
        map.setLayoutProperty('grid_outline', 'visibility', 'none');
        map.setLayoutProperty('grid_substation', 'visibility', 'none');
        map.setLayoutProperty('grid_label', 'visibility', 'none');
    }
}

export function setCameraPosition(map, camPos) {
  var { lng, lat, altitude, pitch, bearing } = camPos;
  altitude += map.queryTerrainElevation({lat: lat, lng: lng}) || 0;
  const pitch_ = pitch * Math.PI / 180;
  const cameraToCenterDistance = 0.5 / Math.tan(map.transform._fov / 2) * map.transform.height;
  const pixelAltitude = Math.abs(Math.cos(pitch_) * cameraToCenterDistance);
  const metersInWorldAtLat = (2 * Math.PI * 6378137 * Math.abs(Math.cos(lat * (Math.PI / 180))));
  const worldsize = (pixelAltitude / altitude) * metersInWorldAtLat;
  const zoom = Math.log(worldsize / map.transform.tileSize) / Math.LN2;
  const latOffset = Math.tan(pitch_) * cameraToCenterDistance;
  const newPixelPoint = new maplibregl.Point(map.transform.width / 2, map.transform.height / 2 + latOffset);
  const newLongLat = new maplibregl.LngLat(lng, lat);
  map.transform.zoom = zoom;
  map.transform.pitch = pitch;
  map.transform.bearing = bearing;
  // console.log(cameraToCenterDistance, pixelAltitude, metersInWorldAtLat, worldsize, latOffset, newPixelPoint, newLongLat, lng, lat, zoom, pitch, bearing);
  map.transform.setLocationAtPoint(newLongLat, newPixelPoint);
  map.setBearing(map.getBearing());
}

export function getBearing(currentpos, turbinepos) {
  var point1 = {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [currentpos.lng, currentpos.lat]
    }
  };
  var point2 = {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [turbinepos.lng, turbinepos.lat]
    }
  };
  return bearing(point1, point2);
}

export function initializeMap(map, page, startinglat, startinglng, turbinelat, turbinelng) {
  // console.log("initializeMap", map, page, startinglat, startinglng, turbinelat, turbinelng);
  switch (page) {
    case PAGE.HOME:
      break;
    case PAGE.NEARESTTURBINE_OVERVIEW:
      if ((startinglat !== null) && (startinglng !== null) && (turbinelat !== null) && (turbinelng !== null)) {
        const deltalat = turbinelat - startinglat;
        const deltalng = turbinelng - startinglng;
        const southWest = [turbinelng - deltalng, turbinelat - deltalat];
        const northEast = [turbinelng + deltalng, turbinelat + deltalat];
        map.setPitch(0);
        map.setBearing(0);
        map.fitBounds([southWest, northEast], {animate: true, padding: 150}); 
      }
      break;
    case PAGE.NEARESTTURBINE:
      var pointbearing = getBearing({lat: startinglat, lng: startinglng}, {lat: turbinelat, lng: turbinelng});
      setCameraPosition(map, {lng: startinglng, lat: startinglat, altitude: 50, pitch: 85, bearing: pointbearing});
      map.flyTo({center: map.getCenter(), animate: true});
      break;
    case PAGE.EXPLORE:
      map.flyTo({center: {lng: DEFAULT_CENTRE[0], lat: DEFAULT_CENTRE[1]}, pitch:0, bearing: 0, zoom: 5, animate: false});
      break;
  }  
}
