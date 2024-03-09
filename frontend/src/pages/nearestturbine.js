import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { 
  IonApp, 
  IonHeader, 
  IonContent, 
  IonList,
  IonItem,
  IonText, 
  IonAlert,
  IonModal, 
  IonToolbar, 
  IonTitle, 
  IonButton, 
  IonButtons, 
  IonIcon 
} from '@ionic/react';
import { downloadOutline, closeOutline } from 'ionicons/icons';
import toast, { Toaster } from 'react-hot-toast';
import { point, bearing, buffer, bbox } from '@turf/turf';
import { useLoader, useFrame} from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, {Marker, ScaleControl} from 'react-map-gl/maplibre';
import { Canvas } from "react-three-map/maplibre";
import { v4 as uuidv4 } from 'uuid';
import maplibregl from '!maplibre-gl'; // eslint-disable-line import/no-webpack-loader-syntax

import { DOMAIN_BASEURL } from '../constants';
import { global } from "../actions";
import Toolbar from '../components/toolbar';
import { initShaders, initVertexBuffers } from './webgl';
import { FlyToggle } from '../components/flytoggle';
import { RecordVideo } from '../components/recordvideo';
import { Download } from '../components/download';

import { 
  TILESERVER_BASEURL
} from "../constants";

var turf = require('@turf/turf');

function WindTurbine() {
  const tower_gltf = useLoader(GLTFLoader, "./windturbine_tower.gltf");
  const blades_gltf = useLoader(GLTFLoader, "./windturbine_blades.gltf");
  const myMesh = React.useRef();

  useFrame(({ clock }) => {
    const a = clock.getElapsedTime();
    myMesh.current.rotation.x = -a;
  });

  return (
    <>
    <mesh position={[0, 2.42, 0]} scale={2}>
      <mesh position={[0, -2.42, 0]}>
        <primitive object={tower_gltf.scene} scale={1} />
      </mesh>
      <mesh ref={myMesh} position={[0, 1, 0]}>
        <primitive object={blades_gltf.scene} scale={1} />
      </mesh>
    </mesh>
    </>
  )
}



/**
 * Main template class for App 
 */
class NearestTurbine extends Component {

    constructor(props) {
      super(props);
      this.state = {
        maploaded: false, 
        altitude: null, 
        flying: false, 
        flyingcentre: null, 
        draggablesubmap: true,
        showdownload: false,
        generatingfile: false,
        progress: 0
      };
      this.updatealtitude = false;
      this.ignoremovend = false;
      this.mapRef = React.createRef();
      this.submapRef = React.createRef();
      this.style_threedimensions = require('../constants/style_threedimensions.json');
      this.style_twodimensions = require('../constants/style_twodimensions.json');
      this.satellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_threedimensions);
      this.nonsatellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_twodimensions);
      this.flytoggle = new FlyToggle({mapcontainer: this});
      this.recordvideo = new RecordVideo({mapcontainer: this});
      this.download = new Download({mapcontainer: this});

      if ((this.props.global.currentlng === null) || 
          (this.props.global.currentlat === null) || 
          (this.props.global.turbinelng === null) || 
          (this.props.global.turbinelat === null)) {
          this.props.history.push("");
      } 
    }

    updateSubmapPosition = () => {
      var cameraposition = this.getCameraPosition();
      this.props.setGlobalState({currentlat: cameraposition.lat, currentlng: cameraposition.lng});
    }
  
    incorporateBaseDomain = (baseurl, json) => {

      let newjson = JSON.parse(JSON.stringify(json));
      const sources_list = ['openmaptiles', 'terrainSource', 'hillshadeSource', 'allplanningconstraints', 'windspeed', 'renewables', 'grid', 'positivefarms'];
  
      for(let i = 0; i < sources_list.length; i++) {
        var id = sources_list[i];
        if (id in newjson['sources']) {
          if ('url' in newjson['sources'][id]) {
            if (!(newjson['sources'][id]['url'].startsWith('http'))) {
              newjson['sources'][id]['url'] = baseurl + newjson['sources'][id]['url'];
            }       
          }
        }
      }
  
      var newlayers = [];
      for(let i = 0; i < newjson['layers'].length; i++) {
        newlayers.push(newjson['layers'][i]);
      }
  
      newjson['layers'] = newlayers;
      newjson['glyphs'] = baseurl + newjson['glyphs'];
      newjson['sprite'] = baseurl + newjson['sprite'];
    
      return newjson;
    }
  
    getBearing = (currentpos, turbinepos) => {
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

    onSubmapLoad = (event) => {
      var submap = this.submapRef.current.getMap();
      submap.dragRotate.disable();
      submap.touchZoomRotate.disableRotation();
      let scale = new maplibregl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
      });
      submap.addControl(scale, 'top-right');

    }

    loadModel = () => {
      const gltf = useLoader(GLTFLoader, 'https://maplibre.org/maplibre-gl-js/docs/assets/34M_17/34M_17.gltf');
      const model = gltf.scene;
      return model;
    }
    
    getCameraPosition = () => {
      var map = this.mapRef.current.getMap();
      const pitch = map.transform._pitch;
      const altitude = Math.cos(pitch) * map.transform.cameraToCenterDistance;
      const latOffset = Math.tan(pitch) * map.transform.cameraToCenterDistance;
      const latPosPointInPixels = map.transform.centerPoint.add(new maplibregl.Point(0, latOffset));
      const latLong = map.transform.pointLocation(latPosPointInPixels);
      const verticalScaleConstant = map.transform.worldSize / (2 * Math.PI * 6378137 * Math.abs(Math.cos(latLong.lat * (Math.PI / 180))));
      const altitudeInMeters = altitude / verticalScaleConstant;
      return { lng: latLong.lng, lat: latLong.lat, altitude: altitudeInMeters, pitch: pitch * 180 / Math.PI };
    }

    setCameraPosition = (camPos) => {
      var map = this.mapRef.current.getMap();
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
      map.transform.setLocationAtPoint(newLongLat, newPixelPoint);
      map.setBearing(map.getBearing());
    }

    onMapLoad = (event) => {
      
      toast.success("Showing nearest potential wind site...", {duration: 4000});

      var map = this.mapRef.current.getMap();
      if ((this.props.global.currentlng !== null) && 
          (this.props.global.currentlat !== null) && 
          (this.props.global.turbinelng !== null) && 
          (this.props.global.turbinelat !== null)) {
        this.reorientToTurbine(map);
      }  
      this.setState({maploaded: true});

      map.addControl(new maplibregl.AttributionControl(), 'bottom-left');
      map.addControl(this.flytoggle, 'top-left'); 
      map.addControl(this.recordvideo, 'top-left'); 
      map.addControl(this.download, 'top-left'); 
    }
    
    reorientToTurbine = (map) => {
      var pointbearing = this.getBearing({lat: this.props.global.currentlat, lng: this.props.global.currentlng}, {lat: this.props.global.turbinelat, lng: this.props.global.turbinelng});
      this.setCameraPosition({lng: this.props.global.currentlng, lat: this.props.global.currentlat, altitude: 50, pitch: 85, bearing: pointbearing});
    }

    reloadSubmap = (submap) => {
      // Fit view position and turbine into map area if they're located outside current bounds
      const currBounds = submap.getBounds();
      if ((this.props.global.currentlat > currBounds._ne.lat) ||
          (this.props.global.currentlat < currBounds._sw.lat) ||
          (this.props.global.currentlng > currBounds._ne.lng) ||
          (this.props.global.currentlng < currBounds._sw.lng) || 
          (this.props.global.turbinelat > currBounds._ne.lat) ||
          (this.props.global.turbinelat < currBounds._sw.lat) ||
          (this.props.global.turbinelng > currBounds._ne.lng) ||
          (this.props.global.turbinelng < currBounds._sw.lng)) {
          var pointdistance = turf.distance(point([this.props.global.currentlng, this.props.global.currentlat]), point([this.props.global.turbinelng, this.props.global.turbinelat]), {units: 'degrees'});
          const southWest = [this.props.global.turbinelng - pointdistance, this.props.global.turbinelat - pointdistance];
          const northEast = [this.props.global.turbinelng + pointdistance, this.props.global.turbinelat + pointdistance];
          const boundingBox = [southWest, northEast];
          submap.fitBounds(boundingBox, {duration: 0, padding: {top: 65, bottom:65, left: 65, right: 65}});    
      }
    }

    onEyeMarkerDragEnd = (event) => {
      if (this.state.flying) return;

      const lnglat = event.target.getLngLat();
      this.props.setGlobalState({currentlat: lnglat.lat, currentlng: lnglat.lng}).then(() => {
        var map = this.mapRef.current.getMap();
        this.reorientToTurbine(map);
      });     
    }

    onTurbineMarkerDragEnd = (event) => {
      if (this.state.flying) return;

      const lnglat = event.target.getLngLat();
      // const submap = this.submapRef.current.getMap();
      // const point = submap.project(lnglat);
      // const features = submap.queryRenderedFeatures(point);
      // if (features.length > 0) {
      //   const firstfeature = features[0];
      //   if (((firstfeature['source'] === 'allplanningconstraints') && (firstfeature['sourceLayer'] === 'all')) ||
      //       ((firstfeature['source'] === 'openmaptiles') && (firstfeature['sourceLayer'] === 'water'))) {

      //         if (firstfeature['sourceLayer'] === 'water') toast('Sorry, system not intended for offshore wind');
      //         else toast('Sorry, intended position has planning constraints');
      //       event.target.setLngLat({lat: this.props.global.turbinelat, lng: this.props.global.turbinelng});
      //       return;
      //   }
      // }
      this.props.setGlobalState({turbinelat: lnglat.lat, turbinelng: lnglat.lng}).then(() => {
        var map = this.mapRef.current.getMap();
        this.reorientToTurbine(map);
      });
    }

    onRender = (event) => {

      var gl = event.target.painter.context.gl;
      var canvas = event.target.getCanvas();

      // Have to do some involved gl drawing to set background colour on transparency
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.enable( gl.BLEND );
      gl.blendEquation( gl.FUNC_ADD );
      gl.blendFunc( gl.ONE_MINUS_DST_ALPHA, gl.DST_ALPHA );
      if (!initShaders(gl)) {
        console.log('Failed to intialize shaders.');
        return;
      }

      var n = initVertexBuffers(gl);
      if (n < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
      }

      gl.drawArrays(gl.TRIANGLES, 0, n);

    }
    
    onIdle = () => {
      if (this.updatealtitude) {
        this.updateAltitude();
        this.updatealtitude = false;
      }

      if (this.state.flying) {
        console.log("onIdle, triggering flyaround");
        this.flyingRun();
      }    
    }

    onMapMoveEnd = (event) => {
      // return;

      if (this.state.flying) return;

      this.updatealtitude = true;

      if (this.ignoremovend) {
        this.ignoremovend = false;
        return;
      }

      const targetmap = event.target;
      const cameraposition = this.getCameraPosition();
      const submap = this.submapRef.current.getMap();
      this.props.setGlobalState({currentlng: cameraposition.lng, currentlat: cameraposition.lat}).then(() => {
        this.ignoremovend = true;
        this.reorientToTurbine(targetmap);
        this.reloadSubmap(submap);
      });
    }

    updateAltitude = () => {
      if (this.mapRef.current !== null) {
        const map = this.mapRef.current.getMap();
        const altitude = map.queryTerrainElevation({lat: this.props.global.turbinelat, lng: this.props.global.turbinelng}) || 0;
        this.setState({altitude: altitude});
      }
    }

    flyingStart = () => {
      if (!this.state.flying) {
        this.setState({flying: true, draggablesubmap: false}, () => {
          this.submapInterval = setInterval(this.updateSubmapPosition, 200);
          this.flyingRun();
        });
      }
    }

    flyingStop = () => {
      this.setState({flying: false, draggablesubmap: true}, () => {  
        clearInterval(this.submapInterval);
        if (this.mapRef) {
          var map = this.mapRef.current.getMap();
          var centre = map.getCenter();
          var zoom = map.getZoom();
          map.jumpTo({center: centre, zoom: zoom});
          var cameraposition = this.getCameraPosition();
          this.props.setGlobalState({currentlat: cameraposition.lat, currentlng: cameraposition.lng, centre: null, zoom: null});
        }
      })
    }

    flyingRun = () => {
      var halfinterval = 60000;
      var degreesperiteration = 120;
  
      if (this.mapRef) {
        var map = this.mapRef.current.getMap();
        var centre = map.getCenter();
        var zoom = map.getZoom();
        if (this.props.global.centre) centre = this.props.global.centre;
        else {
          console.log("Centre is not set - using map's center");
          this.props.setGlobalState({centre: centre});
        }
        if (this.props.global.zoom) zoom = this.props.global.zoom;
        else this.props.setGlobalState({zoom: zoom});        
        // map.jumpTo({center: centre, zoom: zoom});
        var newbearing = parseInt(map.getBearing() + degreesperiteration);
        console.log("About to rotateTo", newbearing, centre);
        map.rotateTo(parseFloat(newbearing), {around: {lat: this.props.global.turbinelat, lng: this.props.global.turbinelng}, easing(t) {return t;}, duration: halfinterval});  
      }
    }

    epsg4326toEpsg3857 = (coordinates) => {
      let x = (coordinates[0] * 20037508.34) / 180;
      let y =
        Math.log(Math.tan(((90 + coordinates[1]) * Math.PI) / 360)) /
        (Math.PI / 180);
      y = (y * 20037508.34) / 180;
      return [x, y];
  }
  
  downloadFile = (type) => {

      const anchor = document.createElement("a");
      var lat = this.props.global.turbinelat;
      var lng = this.props.global.turbinelng;
      
      const precision = 5
      lat = lat.toFixed(precision);
      lng = lng.toFixed(precision);
      const readableposition = String(lat) + "°N, " + String(lng) + "°W"
      const geojson = {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {
                "name": "WeWantWind Wind Turbine Siting - " + readableposition
            },
            "geometry": {
                "type": "Point",
                "coordinates": [parseFloat(lng), parseFloat(lat)]
            },
          }]
      };
      
      // const timesuffix = now.toISOString().substring(0,19).replaceAll('T', ' ').replaceAll(':', '-');
      anchor.download = "WeWantWind - " + readableposition;
  
      switch (type) {
        case 'qgis':
          // anchor.download += '.gqs';
          var turbinepoint = point([parseFloat(lng), parseFloat(lat)]);
          var turbinebuffer = buffer(turbinepoint, 5, {units:'kilometers'});
          var boundingbox = bbox(turbinebuffer);
          var qgis = require("../constants/qgis_template.qgs");            
          fetch(qgis)
          .then(r => r.text())
          .then(qgistext => {
            anchor.download += ".qgs";
            var bottomleft = [boundingbox[0], boundingbox[1]];
            var topright = [boundingbox[2], boundingbox[3]];
            var convertedbottomleft = this.epsg4326toEpsg3857(bottomleft);
            var convertedtopright = this.epsg4326toEpsg3857(topright);
            qgistext = qgistext.replaceAll("##XMIN##", convertedbottomleft[0]);
            qgistext = qgistext.replaceAll("##YMIN##", convertedbottomleft[1]);
            qgistext = qgistext.replaceAll("##XMAX##", convertedtopright[0]);
            qgistext = qgistext.replaceAll("##YMAX##", convertedtopright[1]);
            qgistext = qgistext.replaceAll("##CUSTOMGEOJSONURL##", DOMAIN_BASEURL + '/geojson/' + '?lat=' + String(lat) + '&amp;lng=' + String(lng));
            qgistext = qgistext.replaceAll("##CUSTOMGEOJSONID##", uuidv4().replaceAll("-", "_"));
            anchor.href =  URL.createObjectURL(new Blob([qgistext], {type: "application/x-qgis"}));
            anchor.click();
         });
          break;
        case 'word':
        case 'pdf':
          var mimetype = 'application/msword';
          if (type === 'pdf') {
            mimetype = 'application/pdf';
            anchor.download += '.pdf';
          } else {
            anchor.download += '.docx';
          }
          const docurl = DOMAIN_BASEURL + '/sitereport' + '?type=' + type + '&lat=' + String(lat) + '&lng=' + String(lng);
          this.setState({generatingfile: true, progress: 0});
          var timer = setInterval(() => {
            var currentstep = this.state.progress;
            if (currentstep < 100) {
              currentstep += 5;
              this.setState({progress: currentstep});  
            }
          }, 1300);
          fetch (docurl)
          .then(r => r.blob())
          .then(binarydoc => {
            anchor.href =  URL.createObjectURL(binarydoc);
            anchor.click();
            this.setState({generatingfile: false});
            clearInterval(timer);
          })
          break;
        default:
          anchor.download += '.geojson';
          anchor.href =  URL.createObjectURL(new Blob([JSON.stringify(geojson, null, 2)], {type: "application/geo+json"}));
          anchor.click();
          break;
      }
    }

    render() {
        return (
          <IonApp>
          <IonHeader translucent="true" className="ion-no-border">
            <Toolbar />
          </IonHeader>
          <IonContent fullscreen="true">
          <div class="map-wrap">

          <IonAlert isOpen={this.state.generatingfile} backdropDismiss={false} header={"Generating new file, please wait... " + String(this.state.progress) + "%"} />            
          <IonModal isOpen={this.state.showdownload} onDidDismiss={() => this.setState({showdownload: false})}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Download planning files</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => this.setState({showdownload: false})}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
              <IonList lines="none">
                <IonItem>
                  <IonText>
                    <IonButton onClick={() => {this.downloadFile('geojson')}} color="light" size="medium" fill="default">
                    <IonIcon slot="start" icon={downloadOutline}></IonIcon>GeoJSON</IonButton>
                  </IonText>
                </IonItem>
                <IonItem>
                  <IonText>
                    <IonButton onClick={() => {this.downloadFile('qgis')}} color="light" size="medium" fill="default">
                    <IonIcon slot="start" icon={downloadOutline}></IonIcon>QGIS</IonButton>
                  </IonText>                                            
                </IonItem>
                <IonItem>
                  <IonText>
                    <IonButton onClick={() => {this.downloadFile('word')}} color="light" size="medium" fill="default">
                    <IonIcon slot="start" icon={downloadOutline}></IonIcon>Word</IonButton>
                  </IonText>                  
                </IonItem>
                <IonItem>
                  <IonText>
                    <IonButton onClick={() => {this.downloadFile('pdf')}} color="light" size="medium" fill="default">
                    <IonIcon slot="start" icon={downloadOutline}></IonIcon>PDF</IonButton>
                  </IonText>
                
                </IonItem>

              </IonList>
          </IonContent>
        </IonModal>


            <Toaster position="top-center" containerStyle={{top: 50}}/>

            <div className="submap">
                <div className="turbine-distance">
                  Turbine distance: {this.props.global.distance_km.toFixed(1) + ' km'} / {this.props.global.distance_mi.toFixed(1) + ' miles'}
                </div>
                <Map ref={this.submapRef}
                  onLoad={this.onSubmapLoad}
                  mapStyle={this.nonsatellitelayer}
                  attributionControl={false}
                  initialViewState={{
                    longitude: this.props.global.currentlng,
                    latitude: this.props.global.currentlat,
                    pitch: 0,
                    zoom: 18,
                    maxPitch: 10
                  }} >
                  <Marker onDragEnd={this.onTurbineMarkerDragEnd} longitude={this.props.global.turbinelng} latitude={this.props.global.turbinelat} draggable={this.state.draggablesubmap} anchor="bottom" >
                    <img alt="Wind turbine" width="40" src="./windturbine_black.png" />
                  </Marker>                  
                  <Marker onDragEnd={this.onEyeMarkerDragEnd} longitude={this.props.global.currentlng} latitude={this.props.global.currentlat} draggable={this.state.draggablesubmap} anchor="center" >
                    <img alt="Your location" width="40" src="./eye.png" />
                  </Marker>                  
                  </Map>

            </div>

            <div className="map-wrap">
              <Map ref={this.mapRef}
                onLoad={this.onMapLoad} 
                onRender={this.onRender}
                onMoveEnd={this.onMapMoveEnd}
                onIdle={this.onIdle}
                mapStyle={this.satellitelayer}
                terrain={{source: "terrainSource", exaggeration: 1.1 }}
                attributionControl={false}
                initialViewState={{
                  longitude: this.props.global.currentlng,
                  latitude: this.props.global.currentlat,
                  pitch: 85,
                  zoom: 18,
                  maxPitch: 85
                }} >
                    <Tooltip id="ctrlpanel-tooltip" place="right" variant="light" style={{fontSize: "120%"}} />

                    <Canvas latitude={this.props.global.turbinelat} longitude={this.props.global.turbinelng} altitude={this.state.altitude}>
                        <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]} />
                        <object3D scale={25} rotation={[0, 1, 0]}>
                            <WindTurbine />
                        </object3D>
                    </Canvas>
                </Map>
            </div> 

          </div>
          </IonContent>

        </IonApp>
  
            );
    }
}

export const mapStateToProps = state => {
  return {
    global: state.global
  }
}
    
export const mapDispatchToProps = dispatch => {
  return {
      setGlobalState: (globalstate) => {
        return dispatch(global.setGlobalState(globalstate));
      },  
  }
}  

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(NearestTurbine));