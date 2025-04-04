import React, { Component, useMemo, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import ReCAPTCHA from "react-google-recaptcha";
import { 
  IonApp, 
  IonHeader, 
  IonContent, 
  IonSelect,
  IonSelectOption,
  IonList,
  IonItem,
  IonText, 
  IonInput,
  IonAlert,
  IonModal, 
  IonToolbar, 
  IonTitle, 
  IonButton, 
  IonButtons, 
  IonIcon,
  IonCheckbox,
  IonGrid, 
  IonRow, 
  IonCol, 
  IonicSafeString,
} from '@ionic/react';
import { downloadOutline } from 'ionicons/icons';
import toast, { Toaster } from 'react-hot-toast';
import queryString from "query-string";
import { point, centroid, bearing, buffer, bbox, destination } from '@turf/turf';
import { useLoader, useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Popup, Marker, GeolocateControl } from 'react-map-gl/maplibre';
// import { Canvas, Coordinates } from "react-three-map/maplibre";
// import { Canvas } from "@react-three/fiber";
import { v4 as uuidv4 } from 'uuid';
import maplibregl, {LngLat} from '!maplibre-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import { 
    DOMAIN_BASEURL, 
    LOCAL_DISTANCE, 
    DEFAULT_MAXBOUNDS, 
    DEFAULT_CENTRE,  
    THREED_ZOOM,
    ANIMATION_INTERVAL,
    PLANNING_CONSTRAINTS,
    PAGE,
    TESTING_RANDOMPOINT, 
    TOTAL_SITES,
    TURBINE_PADDING         
} from '../constants';
import { global } from "../actions";
import { initializeMap, mapRefreshPlanningConstraints } from "../functions/map";
import { setURLState } from "../functions/urlstate";
import Toolbar from '../components/toolbar';
import { initShaders, initVertexBuffers, renderImage } from './webgl';
import { Spacer } from '../components/spacer';
import { Site } from '../components/site';
import { Visibility } from '../components/visibility';
import { Vote } from '../components/vote';
import { Download } from '../components/download';
import { Message } from '../components/message';
import { FlyToggle } from '../components/flytoggle';
import { RecordVideo } from '../components/recordvideo';
import { Share } from '../components/share';
import { Wind } from '../components/wind';
import { Constraints } from '../components/constraints';
import { Grid } from '../components/grid';
import { PlanningApplications } from '../components/planningapplications';

import { 
  TILESERVER_BASEURL
} from "../constants";

var turf, { distance } = require('@turf/turf');
// const distance = require('@turf/distance').default;

window.Ionic = {
  config: {
    innerHTMLTemplatesEnabled: true
  }
}

function WindTurbine(props) {
  const tower_gltf = useLoader(GLTFLoader, "./static/models/windturbine_tower.gltf");
  const blades_gltf = useLoader(GLTFLoader, "./static/models/windturbine_blades.gltf");
  const turbinemesh = React.useRef();
  const tower_gltf_clone = useMemo(() => tower_gltf.scene.clone(), [tower_gltf.scene]);
  const blades_gltf_clone = useMemo(() => blades_gltf.scene.clone(), [blades_gltf.scene]);

  useFrame(({ clock }) => {
    const a = clock.getElapsedTime();
    turbinemesh.current.rotation.x = -(1.5 * a);
  });

  // return (
  //   <>
  //   <mesh onClick={props.container.onClickMarker} position={[0, 2.42, 0]} rotation-y={4 * Math.PI / 4} scale={2}>
  //     <mesh position={[0, -2.42, 0]}>
  //       <primitive object={tower_gltf.scene} scale={1} />
  //     </mesh>
  //     <mesh ref={turbinemesh} position={[0, 1, 0]}>
  //       <primitive object={blades_gltf.scene} scale={1} />
  //     </mesh>
  //   </mesh>
  //   </>
  // )

  return (
    <>
    <mesh onClick={props.container.onClickMarker} position={[0, 0, 0]} rotation-y={4 * Math.PI / 4} scale={1}>
      <meshStandardMaterial color="white" />

      <mesh position={[0, 0, 0]}>
        <primitive object={tower_gltf_clone} scale={props.container.props.global.turbinetowerheight / 100} />
      </mesh>
      <mesh ref={turbinemesh} position={[0, (3.42 * props.container.props.global.turbinetowerheight / 100), 0]}>
        <primitive object={blades_gltf_clone} scale-x={1 * props.container.props.global.turbinetowerheight / 100} scale-y={2.385 * props.container.props.global.turbinebladeradius / 100} scale-z={2.385 * props.container.props.global.turbinebladeradius / 100} rotation-x={3.1 * Math.PI / 4} />
      </mesh>
    </mesh>
    </>
  )

}

var mutex = false;

/**
 * Main template class 
 */
class Main extends Component {

    constructor(props, context) {
      super(props, context);
      this.verifyCallback = this.verifyCallback.bind(this);
      this.maxTileCacheSize = this.getMaxTileCacheSize();
      this.state = {
        calculatingposition: false, 
        calculatingnearestturbine: false, 
        positionerror: false,
        locationnotenabled: false,
        locationinitialized: false,
        flying: false, 
        flyingcentre: null, 
        draggablesubmap: true,
        loosevote: null,
        showselectsite: false,
        showloosevote: false,
        showmarker: true,
        showsite: false,
        showvisibility: false,
        showvote: false,
        showturbine: false,
        showdownload: false,
        showmessage: false,
        showshare: false,
        showwind: false,
        showgrid: false,
        showplanningapplications: false,
        showtooltipvisibility: false,
        showtooltipsite: false,
        showtooltipvote: false,
        showtooltipdownload: false,
        showtooltipmessage: false,
        showtooltipshare: false,
        showtooltipfly: false,
        showtooltiprecord: false,
        generatingfile: false,
        progress: 0,
        preflightposition: null,
        name: '',
        email: '',
        contactchecked: true,
        cookieschecked: true,
        isValidName: false,
        isValidEmail: false,
        isTouchedEmail: false,
        recaptcha: undefined,
        recaptchaError: '',
        centreset: false,
        alertIsOpen: false,
        alertText: ''  ,
        windturbine: '',  
        turbineparameters: {},
        hubheight: null,
        hubheights: [],
        currentwindturbines: [],
        textimage: null,
      };
      this.data = []; 
      this.settingbounds = false;
      this.helpIndex = 0;
      this.ignoremovend = false;
      this.loadingurl = false;
      this.mapRef = React.createRef();
      this.threeRef = React.createRef();
      this.submapRef = React.createRef();
      this.popupRef = React.createRef();
      this.windturbines = require('../constants/windturbines.json');
      this.style_explore = require('../constants/style_explore.json');
      this.style_threedimensions = require('../constants/style_threedimensions.json');
      this.style_twodimensions = require('../constants/style_twodimensions.json');
      this.style_planningconstraints_defaults = require('../constants/style_planningconstraints_defaults.json');
      this.style_planningconstraints = this.constructPlanningConstraints(require('../constants/style_planningconstraints.json'));
      this.explorelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_planningconstraints, this.style_explore);
      this.satellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_planningconstraints, this.style_threedimensions);
      this.nonsatellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_planningconstraints, this.style_twodimensions);
            
      let path = window.location.pathname;
      if (path === '/toggletesting/') {
        console.log("Enabling testing mode...")
        this.props.setGlobalState({testingenabled: !this.props.global.testingenabled});
        this.props.history.push("/");
      }
  
      const buttons = {
        'visibility':             new Visibility({mapcontainer: this}),
        'site':                   new Site({mapcontainer: this}),
        'vote':                   new Vote({mapcontainer: this}),
        'download':               new Download({mapcontainer: this}),
        'message':                new Message({mapcontainer: this}),
        'share':                  new Share({mapcontainer: this}),
        'fly':                    new FlyToggle({mapcontainer: this}),
        'video':                  new RecordVideo({mapcontainer: this}),
        'wind':                   new Wind({mapcontainer: this}),
        'planning':               new Constraints({mapcontainer: this}),
        'grid':                   new Grid({mapcontainer: this}),
        'planningapplications':   new PlanningApplications({mapcontainer: this})
      }

      this.props.setGlobalState({'buttons': buttons});

      this.hoveredPolygonId = null;
    }

    componentDidMount(){
      let params = queryString.parse(this.props.location.search);
      if ((params.lat !== undefined) && (params.lng !== undefined)) {
          var lat = parseFloat(params.lat);
          var lng = parseFloat(params.lng);
          this.loadingurl = true;

          if ((this.props.global.startinglat !== null) && (this.props.global.startinglng !== null)) 
          {
            this.showTurbine({startingposition: {latitude: this.props.global.startinglat, longitude: this.props.global.startinglng}, turbineposition: {latitude: lat, longitude: lng}});
          } else {
            if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((position) => {
                    this.showTurbine({startingposition: {latitude: position.coords.latitude, longitude: position.coords.longitude}, turbineposition: {latitude: lat, longitude: lng}})
                  }, this.notfoundCurrentPosition);
            } else {
              this.loadingurl = false;
            }              
        }
      }         

    }

    showTurbine = (params) => {
      var startingposition = params.startingposition;
      var turbineposition = params.turbineposition;
      var currentposition = {latitude: null, longitude: null};
      let urlparams = queryString.parse(this.props.location.search);
      if (!isNaN(urlparams.vlat) && !isNaN(urlparams.vlng)) {
        currentposition = {latitude: parseFloat(urlparams.vlat), longitude: parseFloat(urlparams.vlng)};
      } else {
        var currentposition = JSON.parse(JSON.stringify(params.turbineposition));
        currentposition.latitude -= 0.01;          
      }
      this.props.setGlobalState({
        startinglat: startingposition.latitude, 
        startinglng: startingposition.longitude, 
        currentlat: currentposition.latitude, 
        currentlng: currentposition.longitude, 
        turbinelat: turbineposition.latitude,
        turbinelng: turbineposition.longitude
      }).then(() => {
        this.ignoremovend = true;
        this.setPage(PAGE.SHOWTURBINE);
      });            
    }

    setVisibility = (active) => {
      if ((this.mapRef !== null) && (this.mapRef.current !== null)) {
        var map = this.mapRef.current.getMap();
        if (map) {
          if (active) {
            this.loadVisibility();
          } else {
            map.getSource('viewshed').setData({type: 'FeatureCollection', features: []});
          }    
        }
      }
      if ((this.submapRef !== null) && (this.submapRef.current !== null)) {
        var submap = this.submapRef.current.getMap();
        if (submap) {
          if (!active) {
            submap.getSource('viewshed').setData({type: 'FeatureCollection', features: []});
          }    
        }
      }
    }

    refreshVisibility = () => {
      this.setVisibility(this.state.showvisibility);
    }

    loadVisibility = () => {
      if ((this.mapRef !== null) && (this.mapRef.current !== null)) {
        var map = this.mapRef.current.getMap();
        if (map) {
          this.props.fetchVisibility({
            lat: this.props.global.turbinelat, 
            lng: this.props.global.turbinelng, 
            hub: this.props.global.turbinetowerheight,
            blade: this.props.global.turbinebladeradius          
          });
        }
      }
    }

    verifyCallback(recaptchaToken) {
      if (recaptchaToken === null) recaptchaToken = undefined;
      this.setState({'recaptcha': recaptchaToken, 'recaptchaError': ''});
    }
  
    showMainMap = (page) => {
        switch (page) {
            case PAGE.HOME: return false;
            default: return true;
        }
    }

    showSubMap = (page) => {
        switch (page) {
            case PAGE.NEARESTTURBINE: return true;
            case PAGE.SHOWTURBINE: return true;
            default: return false;
        }
    }

    showMarkers = (page) => {
        if (this.props.global.turbinelat === null) return false;

        switch (page) {
            case PAGE.NEARESTTURBINE_OVERVIEW: return true;
            case PAGE.EXPLORE: return true;
            default: return false;
        }
    }

    mainmapStyle = (page) => {
        switch (page) {
            case PAGE.EXPLORE: return this.explorelayer;
            case PAGE.NEARESTTURBINE: return this.satellitelayer;
            case PAGE.SHOWTURBINE: return this.satellitelayer;
            default: return this.nonsatellitelayer;
        }
    }

    mainmapPitch = (page) => {
        switch (page) {
            case PAGE.NEARESTTURBINE: return 85;
            default: return 0;
        }
    }

    mainmapMaxPitch = (page) => {
        switch (page) {
            case PAGE.NEARESTTURBINE_OVERVIEW: return 0;
            default: return 85;
        }
    }

    mainmapZoom = (page) => {
        switch (page) {
            case PAGE.NEARESTTURBINE_OVERVIEW: return 18;
            default: return 5;
        }
    }

    updateSubmapPosition = () => {
      if (this.mapRef.current !== null) {
        // var elevation = this.mapRef.current.getMap().queryTerrainElevation({lat: this.props.global.turbinelat, lng: this.props.global.turbinelng}) || 0;
        var cameraposition = this.getCameraPosition();
        this.props.setGlobalState({currentlat: cameraposition.lat, currentlng: cameraposition.lng});
      }
    }
  
    constructPlanningConstraints = (planningconstraints) => {
        // Get existing ids in planning constraints stylesheet
        var idsinstylesheet = [];
        for(let i = 0; i < planningconstraints.length; i++) idsinstylesheet.push(planningconstraints[i]['id']);
    
        // Set colours of planning constraints according to globals
        var colourlookup = {};
        var layerlookup = {};
        var planningconstraints_list = Object.keys(PLANNING_CONSTRAINTS);
        var id;
        for(let i = 0; i < planningconstraints_list.length; i++) {
          for(let j = 0; j < PLANNING_CONSTRAINTS[planningconstraints_list[i]]['layers'].length; j++) {
            id = PLANNING_CONSTRAINTS[planningconstraints_list[i]]['layers'][j];
            colourlookup[id] = PLANNING_CONSTRAINTS[planningconstraints_list[i]]['colour'];
            layerlookup[id] = PLANNING_CONSTRAINTS[planningconstraints_list[i]]['description'];
            if (!idsinstylesheet.includes(id)) {
              idsinstylesheet.push(id);
              var idelements = id.split("_");
              idelements.splice(0, 1);
              var layerid = idelements.splice(0, idelements.length - 2).join("_");
              var styletype = idelements.join("_");
              var styleelement = JSON.parse(JSON.stringify(this.style_planningconstraints_defaults[styletype]));
              styleelement['id'] = id;
              styleelement['source-layer'] = layerid;
              if ('line-color' in styleelement['paint']) styleelement['paint']['line-color'] = colourlookup[id];
              if ('fill-color' in styleelement['paint']) styleelement['paint']['fill-color'] = colourlookup[id];
              planningconstraints.push(styleelement);
            }
          }
        }
    
        this.layerlookup = layerlookup;
        this.interactivelayers = [ 
          'renewables_windturbine',
          'grid',
          'grid_outline',
          'grid_substation',
          'planningapplications',
          'windspeed',
          'votes',
          'votes_line',
        ].concat(idsinstylesheet);
    
        return planningconstraints;
      }
          
      incorporateBaseDomain = (baseurl, planningconstraints, json) => {
  
        let newjson = JSON.parse(JSON.stringify(json));
        const sources_list = ['openmaptiles', 'terrainSource', 'hillshadeSource', 'planningconstraints', 'windspeed', 'renewables', 'grid'];
    
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
          if (newjson['layers'][i]['id'] === 'planning-constraints') {
            for(let j = 0; j < planningconstraints.length; j++) newlayers.push(planningconstraints[j]);
          } else {
            newlayers.push(newjson['layers'][i]);
          }
        }
      
        newjson['layers'] = newlayers;
        newjson['glyphs'] = baseurl + newjson['glyphs'];
        newjson['sprite'] = baseurl + newjson['sprite'];
      
        return newjson;
    }

    incorporateBaseDomain_deprecated = (baseurl, json) => {

      let newjson = JSON.parse(JSON.stringify(json));
      const sources_list = ['openmaptiles', 'terrainSource', 'hillshadeSource', 'planningconstraints', 'windspeed', 'renewables', 'grid'];
  
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
      if (mutex) return;
      mutex = true;
      var map = this.mapRef.current.getMap();
      var { lng, lat, altitude, pitch, bearing } = camPos;
      // Seems to provide correct figure as we've centered the turbine in the viewport
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
      // console.log(cameraToCenterDistance, pixelAltitude, metersInWorldAtLat, worldsize, latOffset, newPixelPoint, newLongLat, lng, lat, zoom, pitch, bearing);
      if (!isNaN(zoom)) map.transform.zoom = zoom;
      map.transform.pitch = pitch;
      map.transform.bearing = bearing;
      map.transform.setLocationAtPoint(newLongLat, newPixelPoint);
      map.setBearing(map.getBearing());
      mutex = false;
    }

    add3DLayer = (map, props) => {
      if (!map.getLayer("3d-model")) {
            
        // configuration of the custom layer for a 3D model per the CustomLayerInterface
        const customLayer = {
            id: '3d-model',
            type: 'custom',
            renderingMode: '3d',
            onAdd (map, gl) {
                this.camera = new THREE.Camera();
                this.scene = new THREE.Scene();
                this.props = props;
                this.blades = null;

                // this.scene.scale.multiply(new THREE.Vector3(1, 1, -1));
                this.scene.scale.multiply(new THREE.Vector3(25, 25, -25));

                this.scene.rotation.x = Math.PI / 2;
                this.scene.rotation.y = 3 * Math.PI / 2;

                const ambientLight = new THREE.AmbientLight();
                const pointLight = new THREE.PointLight();
                const pointLight2 = new THREE.PointLight();
                const hemisphereLight = new THREE.HemisphereLight();
                ambientLight.intensity = (Math.PI / 6);
                pointLight.position.set(800, -400, 400);
                pointLight.decay = 0;
                pointLight.intensity = (0.08 * Math.PI);
                pointLight2.position.set(-8000, -400, 400);
                pointLight2.decay = 0;
                pointLight2.intensity = (0.04 * Math.PI);
                hemisphereLight.args = ["#ffffff", "#60666C"];
                hemisphereLight.intensity = 0.1;
                hemisphereLight.position.set(1, 4.5, 3);
                this.scene.add(ambientLight);
                this.scene.add(pointLight);
                this.scene.add(pointLight2);
                this.scene.add(hemisphereLight);

                const loader = new GLTFLoader();
                loader.load('./static/models/windturbine_tower.gltf', (gltf) => {
                    gltf.scene.position.set(0, 0, 0);
                    gltf.scene.scale.set((this.props.global.turbinetowerheight / 100), (this.props.global.turbinetowerheight / 100), (this.props.global.turbinetowerheight / 100));
                    this.scene.add(gltf.scene);
                  }
                );

                loader.load('./static/models/windturbine_blades.gltf', (gltf) => {
                  this.blades = gltf;
                  gltf.scene.position.set(0, (3.42 * this.props.global.turbinetowerheight / 100), 0);
                  gltf.scene.rotation.x = (6.1 * Math.PI / 4);
                  gltf.scene.scale.set(1 * this.props.global.turbinetowerheight / 100, 2.385 * this.props.global.turbinebladeradius / 100, 2.385 * this.props.global.turbinebladeradius / 100);
                  this.scene.add(gltf.scene);
                  }
                );

                this.map = map;
    
                // use the MapLibre GL JS map canvas for three.js
                this.renderer = new THREE.WebGLRenderer({
                    canvas: map.getCanvas(),
                    context: gl,
                    antialias: true
                });
    
                this.renderer.autoClear = false;
            },
            render (gl, mercatorMatrix) {

                if (this.blades !== null) {
                  const a = (performance.now() / 1000);
                  this.blades.scene.rotation.x = (1.5 * a);              
                }

                // `queryTerrainElevation` gives us the elevation of a point on the terrain
                // **relative to the elevation of `center`**,
                // where `center` is the point on the terrain that the middle of the camera points at.
                // If we didn't account for that offset, and the scene lay on a point on the terrain that is
                // below `center`, then the scene would appear to float in the air.

                const windturbines = map.queryRenderedFeatures({layers: ['renewables_windturbine']});
                var currentwindturbines = [];
                for(var i = 0; i < windturbines.length; i++) currentwindturbines.push(windturbines[i].geometry.coordinates);
                if ((this.props.global.turbinelat !== null) && (this.props.global.turbinelng !== null)) {
                  currentwindturbines.push([this.props.global.turbinelng, this.props.global.turbinelat])        
                }
                // Need to reload this layer every time tubinelat/lng changes as seems to use one-time copy of global variables
                // console.log("3D Layer", currentwindturbines.length, this.props.global.turbinelng);

                for(var i = 0; i < currentwindturbines.length; i++) {
                  const currturbine = currentwindturbines[i];
                  const offsetFromCenterElevation = map.queryTerrainElevation(currturbine) || 0;
                  const sceneOriginMercator = maplibregl.MercatorCoordinate.fromLngLat(currturbine, offsetFromCenterElevation);
                  const sceneTransform = {
                      translateX: sceneOriginMercator.x,
                      translateY: sceneOriginMercator.y,
                      translateZ: sceneOriginMercator.z,
                      scale: sceneOriginMercator.meterInMercatorCoordinateUnits()
                  };                  
                  const m = new THREE.Matrix4().fromArray(mercatorMatrix);
                  const l = new THREE.Matrix4()
                      .makeTranslation(sceneTransform.translateX, sceneTransform.translateY, sceneTransform.translateZ)
                      .scale(new THREE.Vector3(sceneTransform.scale, -sceneTransform.scale, sceneTransform.scale));
                  this.camera.projectionMatrix = m.multiply(l);
                  this.renderer.resetState();
                  this.renderer.render(this.scene, this.camera);
                }

                map.triggerRepaint();
            }
        };
    
        map.addLayer(customLayer);
      }      
    }

    onStyleData = (event) => {

      var map = event.target;
      var props = this.props;

      this.add3DLayer(map, props);
    }

    onMapLoad = (event) => {
        
        this.helpStart();
        this.loadingurl = false;

        var map = this.mapRef.current.getMap();
        let scale = new maplibregl.ScaleControl({
          maxWidth: 2000,
          unit: 'metric',
          style: 'map-scale'
        });

        map.setSky({
          'sky-color': '#b7d0c8',
          'sky-horizon-blend': 1,
          'horizon-color': '#f8f8ee',
          'horizon-fog-blend': 0.1,
          'fog-color': '#f8f8ee',
          'fog-ground-blend': 0.6 // 0 is maximum blend, 1 is zero blend (non-existent)
        });

        // map.addControl(scale, 'bottom-left');

        map.addControl(new Spacer(), 'top-right');

        var newbuttonsstate = initializeMap(  map, 
                                          this.props.global.page,
                                          this.props.global.planningconstraints,
                                          this.props.global.buttons,
                                          this.props.global.buttonsstate, 
                                          this.props.global.startinglat, 
                                          this.props.global.startinglng, 
                                          this.props.global.currentlat,
                                          this.props.global.currentlng,
                                          this.props.global.turbinelat, 
                                          this.props.global.turbinelng );

        this.props.setGlobalState({
            'mapref': this.mapRef, 
            'buttonsstate': newbuttonsstate, 
            'showconstraints': false  
        });

        if (this.props.global.page === PAGE.NEARESTTURBINE_OVERVIEW) {
            toast.success("Showing nearest potential wind site...", {duration: 4000});
        }

        if (this.props.global.page === PAGE.NEARESTTURBINE) {
            if ((this.props.global.currentlng !== null) && 
                (this.props.global.currentlat !== null) && 
                (this.props.global.turbinelng !== null) && 
                (this.props.global.turbinelat !== null)) {
                this.reorientToTurbine(map);
            }  
        }

        map.on('click', 'points', function (e) {
          console.log('clicked on layer', e);
          e.clickOnLayer = true;
        });
  
        var popup = this.popupRef.current;    
        if (popup !== null) popup.remove();  

        // Only animate turbines on non-iOS platforms due to limited memory on iOS
        var isiOS = this.isiOS();
  
        // isiOS = true;
          
        if (!isiOS) setTimeout(this.animateIcons, 1000);

        map.addControl(new maplibregl.AttributionControl(), 'bottom-left');

        // this.add3DLayer(map, this.props);
    }
    
    isiOS = () => {
        // From https://stackoverflow.com/questions/9038625/detect-if-device-is-ios
        // and https://davidwalsh.name/detect-iphone
    
        return (  (navigator.userAgent.match(/iPhone/i)) || 
                  (navigator.userAgent.match(/iPod/i)) || 
                  (navigator.userAgent.match(/iPad/i)) ||
                  (navigator.userAgent.includes("Mac") && "ontouchend" in document));              
    }
    
    isAndroid = () => {
        // From https://davidwalsh.name/detect-android
        var ua = navigator.userAgent.toLowerCase();
        var isAndroid = ua.indexOf("android") > -1; 
        return isAndroid;
    }
  
    getMaxTileCacheSize = () => {
        var maxtilecachesize = 60;
        if (this.isiOS()) {
          maxtilecachesize = 1;
          console.log("iOS, using maxtilecachesize", maxtilecachesize);
          return maxtilecachesize;
        }
        if (this.isAndroid()) {
          maxtilecachesize = 20;
          console.log("Android, using maxtilecachesize", maxtilecachesize);
          return maxtilecachesize;
        }
    
        console.log("Not iOS or Android, using maxtilecachesize", maxtilecachesize);
    
        return maxtilecachesize;
    }

    animateIcons = () => {
        // const intervalmsecs = 250;
        const numframes = 5;
        const totalduration = numframes * ANIMATION_INTERVAL;

        const currentDate = new Date();
        const milliseconds = currentDate.getTime(); 
        const deltamsecs = milliseconds % totalduration;
        const animationindex = 1 + parseInt(deltamsecs / ANIMATION_INTERVAL);
        if ((this.mapRef !== null) && (this.mapRef.current !== null)) {
          var map = this.mapRef.current.getMap();
          if (map) {
            map.setLayoutProperty('renewables_windturbine', 'icon-image', 'windturbine_grey_animated_' + String(animationindex));
          }
        }      

        setTimeout(this.animateIcons, ANIMATION_INTERVAL);
    } 
  
    capitalizeFirstLetter(string) {
        return (string.charAt(0).toUpperCase() + string.slice(1)).replaceAll(":", " ");
    }
    
    onMouseEnter = (event) => {
        if (this.props.global.page !== PAGE.EXPLORE) return;

        var map = this.mapRef.current.getMap();
  
        if (event.features.length > 0) {
          if (this.hoveredPolygonId === null) {
            if (event.features[0].sourceLayer === 'windspeed') {
              var windspeed = parseFloat(event.features[0].properties['DN'] / 10);
              this.props.setGlobalState({'windspeed': windspeed});
              return;
            }
                
            if ((event.features[0].source === 'planningconstraints') || 
                (event.features[0].sourceLayer === 'landuse')) {
              // If mouse over planning constraints, disable add wind turbine
              if (this.props.global.editcustomgeojson === 'wind') {
                this.props.global.mapdraw.changeMode('simple_select');
              }
              return;
            }
  
            map.getCanvas().style.cursor = 'pointer';
            var properties = event.features[0].properties;
            // Note unique numberical ID required for setFeatureState
            // OSM ids, eg 'way/12345' don't work
            this.hoveredPolygonId = event.features[0].id;  
            var featurecentroid = centroid(event.features[0]);
            var description = properties.name;
            var source = "";
            if (properties['power'] !== undefined) {
    
              if (properties['plant:source'] !== undefined) source = properties['plant:source'];
              if (properties['generator:source'] !== undefined) source = properties['generator:source'];
              if (description === undefined) {
                if (source === "solar") description = "Solar Farm";
                if (source === "wind") description = "Wind Farm";  
              }
    
              if (['line', 'minor_line'].includes(properties['power'])) {
                description = 'Power line';
              }
              if (properties['power'] === 'substation') {
                description = 'Substation';
              }
              if (properties['power'] === 'cable') {
                description = 'Underground cable';
              }
    
              if (!(['solar', 'wind'].includes(source))) {
                if (properties.name !== undefined) description += ' - ' + properties.name;
              }
              description = description.replaceAll('?', '');
              description = '<h1 class="popup-h1">' + description + '</h1>';
              var showelements = ['voltage', 'cables', 'circuits', 'operator', 'number:of:elements', 'plant:output:electricity'];
              for(var i = 0; i < showelements.length; i++) {
                var element = showelements[i];
                var value = properties[element];
                var firstcap = this.capitalizeFirstLetter(element);
                firstcap = firstcap.replace('Number of elements', 'Number of turbines');
                firstcap = firstcap.replace('Plant output electricity', 'Power output');
                if (value !== undefined) {
                  if (element === 'voltage') value = value.replaceAll(';', ', ');
                  description += '<p class="popup-p"><b>' + firstcap + ':</b> ' + value + '</p>';
                }
              }
    
            } else {
              if (properties['subtype'] === 'votes') {
                description = '<h1 class="popup-h1">Turbine site votes</h1>';
                description += '<p class="popup-p">' + properties['position'] + '</p>';
                description += '<p class="popup-p"><b>All votes:</b> ' + properties['votes'] + '</p>';
                description += '<p class="popup-p"><b>Votes within 1 mile:</b> ' + properties['votes:within:1:mile'] + '</p>';
                description += '<p class="popup-p"><b>Votes within 5 miles:</b> ' + properties['votes:within:5:miles'] + '</p>';
                description += '<p class="popup-p"><b>Votes within 10 miles:</b> ' + properties['votes:within:10:miles'] + '</p>';
                description += '<p class="popup-p"><i>Click to vote for this site</i></p>';
              }
              if (properties['subtype'] === 'planningapplications') {
                description = '<h1 class="popup-h1">Planning&nbsp;application:&nbsp;' + properties['status'] + '</h1>';
                description += '<p class="popup-p"><b>Position: </b>' + properties['lat'].toString() + '°N ' + properties['lng'].toString() + '°E</p>';
                description += '<p class="popup-p"><b>Identifier: </b>' + properties['id'] + '</p>';
                description += '<p class="popup-p"><b>Date: </b>' + properties['date:of:decision'] + '</p>';
                description += '<p class="popup-p">' + properties['name'] + '</p>';
                description += '<p class="popup-p"><b>Type of application: </b>' + properties['type:of:application'] + '</p>';
                description += '<p class="popup-p"><i>Planning application data obtained from planning websites via planit.org.uk. All data copyright of respective planning authorities</i></p>';
                description += '<p class="popup-p"><b>Click point to view application</b></p>';
              }

              if (description === undefined) {
                description = "No name available";
                source = "";
                if (properties['plant:source'] !== undefined) source = properties['plant:source'];
                if (properties['generator:source'] !== undefined) source = properties['generator:source'];
                if (source === "solar") description = "Solar Farm";
                if (source === "wind") description = "Wind Farm";
              }
            }
            var popup = this.popupRef.current;
            if (popup !== null) {
                popup.setOffset([0, 0]);
                if (properties['renewabletype'] !== undefined) popup.setOffset([0, -10]);
                if (properties['subtype'] === 'votes') popup.setOffset([0, -30]);
                if (properties['subtype'] === 'planningapplications') popup.setOffset([0, -30]);
                popup.setLngLat(featurecentroid.geometry.coordinates).setHTML(description).addTo(map);    
            }
          }  
        }
    }
    
    onMouseMove = (event) => {
        if (this.props.global.page !== PAGE.EXPLORE) return;
    
        if (event.features.length > 0) {
          if (event.features[0].sourceLayer === 'windspeed') {
            var windspeed = parseFloat(event.features[0].properties['DN'] / 10);
            this.props.setGlobalState({'windspeed': windspeed});
            return;
          }
    
        } 
          
        if (this.hoveredPolygonId) {
          var popup = this.popupRef.current;
          if (popup !== null) popup.setLngLat(event.lngLat);
        }
    }
    
    onMouseLeave = (event) => {
        if (this.props.global.page !== PAGE.EXPLORE) return;

        this.props.setGlobalState({'windspeed': null});
        var map = this.mapRef.current.getMap();
        var popup = this.popupRef.current;    
        this.hoveredPolygonId = null;
        map.getCanvas().style.cursor = '';
        if (popup !== null) popup.remove();  
    }
      
    onDrag = (event) => {
      this.setState({centreset: false});  
    }

    setButton = (map, buttonname, state) => {
      if (this.props.global.buttonsstate[buttonname] !== state) {
        if (state) map.addControl(this.props.global.buttons[buttonname], 'top-left');
        else map.removeControl(this.props.global.buttons[buttonname]);
        this.props.setButtonState(buttonname, state);        
      }      
    }

    onClick = (event) => {

        // User clicks so remove centre
        if (event.clickOnLayer) this.setState({centreset: false});  

        if (this.props.global.page !== PAGE.EXPLORE) return;

        const map = this.mapRef.current.getMap();
        const lnglat = event.lngLat;

        if (this.state.showsite) {
          if (lnglat.lng < -180) lnglat.lng += 360;
          this.props.setGlobalState({turbinelat: lnglat.lat, turbinelng: lnglat.lng}).then(() => {
            this.updateCurrentWindTurbines(map);
            this.refreshVisibility();
          });
          this.setButton(map, 'share', true);
          this.setButton(map, 'download', true);
          this.setButton(map, 'visibility', true);
          this.props.global.buttons['site'].deactivateButton();
          var zoom = map.getZoom();
          if (zoom < THREED_ZOOM)   this.setState({showsite: false, showmarker: true});
          else                      this.setState({showsite: false, showmarker: false});

          return;
        }

        // Don't select features if adding asset
        if (event.features.length > 0) {
          var id = event.features[0]['layer']['id'];
          var properties = event.features[0].properties;
          if ((id === 'constraint_windspeed_fill_colour') ||
              (event.features[0].source === 'planningconstraints') || 
              (event.features[0].sourceLayer === 'landuse')) {
                this.setState(
                  {
                    alertIsOpen: true, 
                    alertText: new IonicSafeString("<p>Non-optimal site for wind turbine due to: </p><p><b>" + this.layerlookup[id] + "</b></p>")
                  });
              return false;
          }
    
          if (event.features[0].sourceLayer === 'windspeed') {
            var windspeed = parseFloat(event.features[0].properties['DN'] / 10);
            this.props.setGlobalState({'windspeed': windspeed});
            return false;
          }

          if (event.features[0].source === 'votes') {
            this.setState({loosevote: {lat: event.features[0].properties['lat'], lng: event.features[0].properties['lng']}})
            if (this.props.global.startinglat === null) {
              if (navigator.geolocation) {
                this.setState({calculatingposition: true});
                navigator.geolocation.getCurrentPosition(this.foundCurrentPositionLooseVote, this.notfoundCurrentPosition);
              } else {
                this.setState({calculatingposition: false});        
              }    
            } else this.setState({showloosevote: true});
            return false;
          }

          if (event.features[0].source === 'planningapplications') {
            window.open(event.features[0].properties['link'], "_new");
          }
          
          // Don't respond to clicking on power lines or substations
          if (properties['power'] !== undefined) {
            if (['line', 'minor_line', 'cable', 'substation'].includes(properties['power'])) return;
          }
  
          var entityid = event.features[0].properties.id;
          this.setState({centreset: true});

          if (event.features[0].source === 'renewables') {

            // Replaced the following fetchEntity with using centre/bound properties on every feature
            // this.props.fetchEntity(entityid);

            var boundstext = event.features[0].properties.bounds;
            var centretext = event.features[0].properties.groupcentre;
            var bounds = null;
            var centre = null;
            if (boundstext !== undefined) {
              bounds = boundstext.split(',');
              bounds[0] = parseFloat(bounds[0]);
              bounds[1] = parseFloat(bounds[1]);
              bounds[2] = parseFloat(bounds[2]);
              bounds[3] = parseFloat(bounds[3]);
            }
            if (centretext !== undefined) {
              centre = event.features[0].properties.groupcentre.split(',');
              centre[0] = parseFloat(centre[0]);
              centre[1] = parseFloat(centre[1]);  
            }

            if (centre === null) centre = [lnglat.lng, lnglat.lat];
            if (bounds === null) {
              bounds = [
                          centre[0] - TURBINE_PADDING,
                          centre[1] - TURBINE_PADDING,
                          centre[0] + TURBINE_PADDING,
                          centre[1] + TURBINE_PADDING
                      ]
            }           

            const southWest = [bounds[0], bounds[1]]
            const northEast = [bounds[2], bounds[3]]
            const maxdegree = 0.015;
            const maxSouthWest = [centre[0] - maxdegree, centre[1] - maxdegree];
            const maxNorthEast = [centre[0] + maxdegree, centre[1] + maxdegree];

            if ((maxSouthWest[0] < southWest[0]) && (maxSouthWest[1] < southWest[1])) map.fitBounds([southWest, northEast], {animate: true}); 
            else map.fitBounds([maxSouthWest, maxNorthEast], {animate: true}); 

            this.props.setGlobalState({zoom: null, centre: centre});
          }

        } else {
          if (this.state.showselectsite) {
            // Check whether point is in sea
            const lnglat = event.lngLat;
            if (lnglat.lng < -180) lnglat.lng += 360;  
            const point = map.project(lnglat);
            const features = map.queryRenderedFeatures(point);
            if (features.length > 0) {
              const firstfeature = features[0];
              if ((firstfeature['source'] === 'openmaptiles') && (firstfeature['sourceLayer'] === 'water')) {
                  toast.error('Error: offshore wind location');
                  return;
              }
            }

            // If not in sea - and not a planning constraint then reset and show loosevote dialog to confirm vote
            mapRefreshPlanningConstraints(
              this.props.global.showconstraints, 
              this.props.global.planningconstraints,
              this.mapRef.current.getMap());    
            this.setState({loosevote: {lat: event.lngLat.lat, lng: event.lngLat.lng}, showselectsite: false, showloosevote: true});
          }
        }

        return false;
    }
          
    onPopupClick = () => {
      console.log("onPopupClick");
    }

    onClickMarker = () => {
        if (this.props.global.page === PAGE.EXPLORE) {
            const map = this.mapRef.current.getMap();
            var centre = [this.props.global.turbinelng, this.props.global.turbinelat];
            this.props.setGlobalState({centre: centre});
            this.setState({centreset: true});
            map.easeTo({center: centre, pitch: 85, zoom: 15.5, duration: 1000});
            return false;    
        } else {
            return false;
        }
    }
  
    onTurbineMarkerDragEnd = (event) => {
        if (this.state.flying) return;        
        const lnglat = event.target.getLngLat();
        const map = event.target._map;
        const point = map.project(lnglat);
        const features = map.queryRenderedFeatures(point);
        if (features.length > 0) {
          const firstfeature = features[0];
          if (((firstfeature['source'] === 'planningconstraints') && (firstfeature['sourceLayer'] === 'all')) ||
              ((firstfeature['source'] === 'openmaptiles') && (firstfeature['sourceLayer'] === 'water'))) {
  
                if (firstfeature['sourceLayer'] === 'water') toast.error('System not intended for offshore wind');
                else toast.error('Position has planning constraints');
              event.target.setLngLat({lat: this.props.global.turbinelat, lng: this.props.global.turbinelng});
              return;
          }
        }

        this.props.setGlobalState({turbinelat: lnglat.lat, turbinelng: lnglat.lng}).then(() => {
          var map = this.mapRef.current.getMap();
          if ((this.props.global.page === PAGE.NEARESTTURBINE) || (this.props.global.page === PAGE.SHOWTURBINE)) {
              this.reorientToTurbine(map);    
          }
          this.updateCurrentWindTurbines(map);
          this.refreshVisibility();
        });          
    }
  
    onSubmapLoad = (event) => {
      var submap = this.submapRef.current.getMap();
      submap.dragRotate.disable();
      submap.touchZoomRotate.disableRotation();
      let scale = new maplibregl.ScaleControl({
        maxWidth: 80,
        unit: 'imperial',
        style: 'map-scale'
      });
      submap.addControl(scale, 'top-right');
      this.props.setGlobalState({
        'submapref': this.submapRef        
      });
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
          var pointdistance = distance(point([this.props.global.currentlng, this.props.global.currentlat]), point([this.props.global.turbinelng, this.props.global.turbinelat]), {units: 'degrees'});
          const southWest = [this.props.global.turbinelng - pointdistance, this.props.global.turbinelat - pointdistance];
          const northEast = [this.props.global.turbinelng + pointdistance, this.props.global.turbinelat + pointdistance];
          const boundingBox = [southWest, northEast];
          submap.fitBounds(boundingBox, {duration: 0, padding: {top: 65, bottom:65, left: 20, right: 20}});    
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

    onRender = (event) => {

        if (event.target.getPitch() === 0) return;

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
      if (this.state.flying) {
        console.log("onIdle, triggering flyaround");
        this.flyingRun();
      }
    }
  
    checkBounds = () => {
      if (this.mapRef.current !== null) {
        var map = this.mapRef.current.getMap();
        var currentBounds = map.getBounds();

        if (this.settingbounds) {
          this.settingbounds = false;
          return;
        }

        console.log(currentBounds);

        if ((currentBounds._sw.lng < DEFAULT_MAXBOUNDS[0][0]) || 
            (currentBounds._sw.lat < DEFAULT_MAXBOUNDS[0][1]) || 
            (currentBounds._ne.lng > DEFAULT_MAXBOUNDS[1][0]) ||
            (currentBounds._ne.lat > DEFAULT_MAXBOUNDS[1][1])) {

              if (parseInt(map.getZoom()) == parseInt(map.getMinZoom())) {
                this.settingbounds = true;
                map.fitBounds(DEFAULT_MAXBOUNDS, {animate: false});
                return;
              }
              console.log("Moving outside bounds so resetting");
              console.log(currentBounds);

              const centre = map.getCenter();
              const centrecoordinates = map.project([centre.lng, centre.lat]);

              var screenCentreX = centrecoordinates.x;
              var screenCentreY = centrecoordinates.y;
              var maxBound_sw_Coordinates = map.project([DEFAULT_MAXBOUNDS[0][0], DEFAULT_MAXBOUNDS[0][1]]);
              var maxBound_ne_Coordinates = map.project([DEFAULT_MAXBOUNDS[1][0], DEFAULT_MAXBOUNDS[1][1]]);
              var currentBound_sw_Coordinates = map.project([currentBounds._sw.lng, currentBounds._sw.lat]);
              var currentBound_ne_Coordinates = map.project([currentBounds._ne.lng, currentBounds._ne.lat]);

              if (currentBounds._sw.lng < DEFAULT_MAXBOUNDS[0][0]) {
                const deltaX = 10 + parseInt(currentBound_sw_Coordinates.x - maxBound_sw_Coordinates.x);
                screenCentreX += deltaX;
                console.log("Need to adjust x by", deltaX);               
              }

              if (currentBounds._sw.lat < DEFAULT_MAXBOUNDS[0][1]) {
                const deltaY = 10 + parseInt(currentBound_sw_Coordinates.y - maxBound_sw_Coordinates.y);
                screenCentreY -= deltaY;
                console.log("Need to adjust y by", deltaY);               
              }

              if (currentBounds._ne.lng > DEFAULT_MAXBOUNDS[1][0]) {
                const deltaX = 10 + parseInt(currentBound_ne_Coordinates.x - maxBound_ne_Coordinates.x);
                screenCentreX -= deltaX;
                console.log("Need to adjust x by", deltaX);               
              }

              if (currentBounds._ne.lat > DEFAULT_MAXBOUNDS[1][1]) {
                const deltaY = 10 + parseInt(currentBound_ne_Coordinates.y - maxBound_ne_Coordinates.y);
                screenCentreY -= deltaY;
                console.log("Need to adjust y by", deltaY);               
              }

              const newCentre = map.unproject([screenCentreX, screenCentreY]);
              console.log("currentCentre", map.getCenter(), "newCentre", newCentre);
              
              this.settingbounds = true;
              map.jumpTo({center: newCentre, animate: false});
            
        }
      }

    }

    onMapMoveEnd = (event) => {

      var map = this.mapRef.current.getMap();

      if (this.props.global.pagetransitioning) return;
      if (this.state.flying) return;

      switch (this.props.global.page) {
          case PAGE.NEARESTTURBINE_OVERVIEW:
              this.setState({showmarker: true});
              break;
          case PAGE.EXPLORE:

              if (this.mapRef.current !== null) {
                var map = this.mapRef.current.getMap();
                var zoom = map.getZoom();
                var pitch = map.getPitch();
                var bearing = map.getBearing();
                if (zoom < THREED_ZOOM) {
                    this.setState({showmarker: true});
                    // if ((pitch !== 0) || (bearing !== 0)) map.jumpTo({pitch: 0, bearing: 0, duration: 0})
                    if (pitch === 85) map.jumpTo({pitch: 0, duration: 0, bearing: 0});
                  } else {
                    this.setState({showmarker: false});
                    if (pitch < 80) map.easeTo({pitch: 85, duration: 1000});
                }
              }

              break;
          case PAGE.NEARESTTURBINE:
          case PAGE.SHOWTURBINE:

              if (this.ignoremovend) {
                  this.ignoremovend = false;
                  return;
              }

              if ((this.mapRef.current !== null) && (this.submapRef.current !== null)) {
                  const targetmap = event.target;
                  const cameraposition = this.getCameraPosition();
                  const submap = this.submapRef.current.getMap();
                  this.props.setGlobalState({currentlng: cameraposition.lng, currentlat: cameraposition.lat}).then(() => {
                      this.ignoremovend = true;
                      this.reorientToTurbine(targetmap);
                      this.reloadSubmap(submap);
                  });
              }

              break;
      }
    }

    updateCurrentWindTurbines = (map) => {
      if (map.getLayer("3d-model")) map.removeLayer("3d-model");
    }

    updateHelp = () => {
      if ((this.props.global.page !== PAGE.NEARESTTURBINE) && (this.props.global.page !== PAGE.SHOWTURBINE)) return;

      // console.log("updateHelp", this.helpIndex);
      const links = ['intro', 'vote', 'download', 'message', 'share', 'visibility', 'fly', 'record'];

      if (this.helpIndex > (links.length)) this.helpStop();
      else {
        if (this.helpIndex === 0) {
          if (this.props.global.page === PAGE.NEARESTTURBINE) toast.success("Showing turbine from your location...", {duration: 4000});
        }
        else {
          if (this.helpIndex > 0) {
            var oldtooltipdata = {};
            oldtooltipdata['showtooltip' + links[this.helpIndex - 1]] = false;
            this.setState(oldtooltipdata);
          }
          if (this.helpIndex < links.length) {
            var newtooltipdata = {};
            newtooltipdata['showtooltip' + links[this.helpIndex]] = true;
            this.setState(newtooltipdata);
          }
        }
      }
      this.helpIndex++;
    }

    helpStart = () => {
      this.helpStop();
      var helpInterval = setInterval(this.updateHelp, 4000);
      this.props.setGlobalState({helpInterval: helpInterval});         
    }

    helpStop = () => {
      if (this.props.global.helpInterval !== null) {
        clearInterval(this.props.global.helpInterval);
        this.setState({'showtooltipvisibility': false, 'showtooltipsite': false, 'showtooltipvote': false, 'showtooltipdownload': false, 'showtooltipmessage': false, 'showtooltipshare': false, 'showtooltipfly': false, 'showtooltiprecord': false});
        this.props.setGlobalState({helpInterval: null});
        this.helpIndex = 0;
      }
    }

    flyingStart = () => {
      if (!this.state.flying) {
        var map = this.mapRef.current.getMap();
        this.setState({flying: true, draggablesubmap: false, preflightposition: map.getCenter()}, () => {          

          this.submapInterval = setInterval(this.updateSubmapPosition, 200);

          if ((this.props.global.page === PAGE.NEARESTTURBINE) || (this.props.global.page === PAGE.SHOWTURBINE)) {
            // Start camera from specific position high up and certain bearing from wind turbine
            var turbinepos = point([this.props.global.turbinelng, this.props.global.turbinelat]);
            var viewingdistance = 0.7;
            var viewingbearing = -180;
            var options = {units: 'kilometres'};
            var viewingpos = destination(turbinepos, viewingdistance, viewingbearing, options);
            this.setCameraPosition({lng: viewingpos['geometry']['coordinates'][0], lat: viewingpos['geometry']['coordinates'][1], altitude: 400, pitch: 60, bearing: 180 + viewingbearing});
            this.flyingRun();
          }

          if (this.props.global.page === PAGE.EXPLORE) {
            var mapcentre = map.getCenter();
            var centre = [mapcentre.lng, mapcentre.lat];
            var zoom = map.getZoom();
            if (this.state.centreset) {
              console.log("Centre is set already, using that for flying");
              centre = this.props.global.centre;
              zoom = this.props.global.zoom;
            } 
            this.props.setGlobalState({centre: centre, zoom: zoom}).then(() => {  
              var turbinepos = point(centre);
              var viewingdistance = 4;
              var viewingbearing = -180;
              var options = {units: 'kilometres'};
              var viewingpos = destination(turbinepos, viewingdistance, viewingbearing, options);
              var map = this.mapRef.current.getMap();
              this.setCameraPosition({lng: viewingpos['geometry']['coordinates'][0], lat: viewingpos['geometry']['coordinates'][1], altitude: (400 * viewingdistance / 0.6), pitch: 60, bearing: 180 + viewingbearing});
              this.flyingRun();
            });  
          }
        });
      }
    }

    flyingStop = () => {
      clearInterval(this.submapInterval);
      if ((this.props.global.page === PAGE.NEARESTTURBINE) || (this.props.global.page === PAGE.SHOWTURBINE)) {
        this.props.setGlobalState({currentlat: this.state.preflightposition.lat, currentlng: this.state.preflightposition.lng }).then(() => {
          if (this.mapRef) {
            var map = this.mapRef.current.getMap();
            var pointbearing = this.getBearing({lat: this.props.global.currentlat, lng: this.props.global.currentlng}, {lat: this.props.global.turbinelat, lng: this.props.global.turbinelng});
            map.jumpTo({center: {lat: this.props.global.currentlat, lng: this.props.global.currentlng}, zoom: 18, pitch: 85, bearing: pointbearing});
          }
        })
      }

      if (this.props.global.page === PAGE.EXPLORE) {
        this.props.setGlobalState({currentlat: this.state.preflightposition.lat, currentlng: this.state.preflightposition.lng }).then(() => {
          if (this.mapRef) {
            var map = this.mapRef.current.getMap();
            var centre = map.getCenter();
            var pointbearing = this.getBearing({lat: this.props.global.currentlat, lng: this.props.global.currentlng}, {lat: centre.lat, lng: centre.lng});
            map.jumpTo({center: {lat: this.state.preflightposition.lat, lng: this.state.preflightposition.lng }, animate: false});
          }
        })
      }

      this.setState({flying: false, draggablesubmap: true});
    }

    flyingRun = () => {
      var halfinterval = 60000;
      var degreesperiteration = 120;
  
      if (this.mapRef) {
        var map = this.mapRef.current.getMap();
        if ((this.props.global.page === PAGE.NEARESTTURBINE) || (this.props.global.page === PAGE.SHOWTURBINE)) {
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

        if (this.props.global.page === PAGE.EXPLORE) {
          var newbearing = parseInt(map.getBearing() + degreesperiteration);
          console.log("About to rotateTo", newbearing, this.props.global.centre);
          map.rotateTo(parseFloat(newbearing), {around: this.props.global.centre, easing(t) {return t;}, duration: halfinterval});  
        }
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
      var hub = this.props.global.turbinetowerheight;
      var blade = this.props.global.turbinebladeradius;

      const precision = 5
      lat = lat.toFixed(precision);
      lng = lng.toFixed(precision);
      const readableposition = String(lat) + "°N, " + String(lng) + "°E"
      const geojson = {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {
                "name": "wewantwind.org Wind Turbine Siting - " + readableposition
            },
            "geometry": {
                "type": "Point",
                "coordinates": [parseFloat(lng), parseFloat(lat)]
            },
          }]
      };
      
      // const timesuffix = now.toISOString().substring(0,19).replaceAll('T', ' ').replaceAll(':', '-');
      anchor.download = "WeWantWind.org - " + readableposition;
  
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
            qgistext = qgistext.replaceAll("##CUSTOMGEOJSONURL##", DOMAIN_BASEURL + '/geojson/?lat=' + String(lat) + '&amp;lng=' + String(lng));
            qgistext = qgistext.replaceAll("##CUSTOMGEOJSONID##", uuidv4().replaceAll("-", "_"));
            anchor.href =  URL.createObjectURL(new Blob([qgistext], {type: "application/x-qgis"}));
            anchor.click();
         });
          break;
        case 'word':
        case 'pdf':
          if (type === 'pdf') {
            anchor.download += '.pdf';
          } else {
            anchor.download += '.docx';
          }
          const docurl = DOMAIN_BASEURL + '/sitereport?type=' + type + '&lat=' + String(lat) + '&lng=' + String(lng) + '&hub=' + String(hub) + '&blade=' + String(blade);
          this.setState({generatingfile: true, progress: 0});
          var timer = setInterval(() => {
            var currentstep = this.state.progress;
            if (currentstep < 100) {
              currentstep += 5;
              this.setState({progress: currentstep});  
            }
          }, 2000);
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

    validateName = (ev) => {
      const value = ev.target.value.trim();  
      this.setState({isValidName: undefined});  
      const isValidName = (value !== '');
      if (isValidName) {
        this.setState({isValidName: true, name: value});
      } else {
        this.setState({isValidName: false, name: ''});
      }
    };
    
    validateEmail = (ev) => {
      const value = ev.target.value;  
      this.setState({isValidEmail: undefined});  
      const isValidEmail = (value.match(/^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/) !== null);
      if (isValidEmail) {
        this.setState({isValidEmail: true, email: value});
      } else {
        this.setState({isValidEmail: false, email: ''});
      }
    };

    castVote = () => {
      if (this.state.isValidName && this.state.isValidEmail && (this.state.recaptcha !== undefined)) {
        // Valid name, email and recaptcha so submit form
        this.setState({showvote: false});
        toast.success("Emailing you link to confirm vote", {duration: 4000});
        this.props.castVote(
        {
          name: this.state.name, 
          email: this.state.email, 
          contactable: this.state.contactchecked,
          recaptcha: this.state.recaptcha,
          userlocation: {lat: this.props.global.startinglat, lng: this.props.global.startinglng},
          site: {lat: this.props.global.turbinelat, lng: this.props.global.turbinelng}
        });
      } else {
        if (!this.state.isTouchedName) this.setState({isTouchedName: true});
        if (!this.state.isTouchedEmail) this.setState({isTouchedEmail: true});
        if (this.state.recaptcha === undefined) this.setState({recaptchaError: "Please click \"I'm not a robot\""})
      }
    }  

    castLooseVote = () => {
      if (this.state.isValidName && this.state.isValidEmail && (this.state.recaptcha !== undefined)) {
        // Valid name, email and recaptcha so submit form
        this.setState({showloosevote: false});
        toast.success("Emailing you link to confirm vote", {duration: 4000});
        this.props.castVote(
        {
          name: this.state.name, 
          email: this.state.email, 
          contactable: this.state.contactchecked,
          recaptcha: this.state.recaptcha,
          userlocation: {lat: this.props.global.startinglat, lng: this.props.global.startinglng},
          site: {lat: this.state.loosevote['lat'], lng: this.state.loosevote['lng']}
        });
      } else {
        if (!this.state.isTouchedName) this.setState({isTouchedName: true});
        if (!this.state.isTouchedEmail) this.setState({isTouchedEmail: true});
        if (this.state.recaptcha === undefined) this.setState({recaptchaError: "Please click \"I'm not a robot\""})
      }

    }

    sendMessage = () => {  
      if (this.state.isValidName && this.state.isValidEmail && (this.state.recaptcha !== undefined)) {
        // Valid name, email and recaptcha so submit form
        this.setState({showmessage: false});
        toast.success("Emailing you link to confirm you want to send a message", {duration: 4000});
        this.props.sendMessage(
        {
          name: this.state.name, 
          email: this.state.email, 
          recaptcha: this.state.recaptcha,
          userlocation: {lat: this.props.global.startinglat, lng: this.props.global.startinglng}
        });
      } else {
        if (!this.state.isTouchedName) this.setState({isTouchedName: true});
        if (!this.state.isTouchedEmail) this.setState({isTouchedEmail: true});
        if (this.state.recaptcha === undefined) this.setState({recaptchaError: "Please click \"I'm not a robot\""})
      }
    }  

    sendShare = () => {  
      if (this.state.isValidEmail && (this.state.recaptcha !== undefined)) {
        // Valid email and recaptcha so submit form
        this.setState({showshare: false});
        toast.success("Emailing link to user", {duration: 4000});
        this.props.sendShare(
        {
          email: this.state.email, 
          recaptcha: this.state.recaptcha,
          turbinelocation: {lat: this.props.global.turbinelat, lng: this.props.global.turbinelng},
          currentlocation: {lat: this.props.global.currentlat, lng: this.props.global.currentlng}
        });
      } else {
        if (!this.state.isTouchedEmail) this.setState({isTouchedEmail: true});
        if (this.state.recaptcha === undefined) this.setState({recaptchaError: "Please click \"I'm not a robot\""})
      }
    }  
    
    setPage = (page) => {
        this.props.setGlobalState({pagetransitioning: true}).then(() => {
            this.props.setPage(page);
        })
    }

    selectNearestWindturbine = () => {  

        if (this.props.global.testingenabled) {

            // Use random points for testing
            this.setState({calculatingposition: true});
            this.props.fetchRandomPoint().then(() => {
              // console.log(this.props.global.randompoint);
                this.setState({calculatingposition: false, calculatingnearestturbine: true, startinglat: this.props.global.randompoint.lat, startinglng: this.props.global.randompoint.lng});
                this.props.fetchNearestTurbine({lat: this.props.global.randompoint.lat, lng: this.props.global.randompoint.lng}).then(() => {
                    this.setState({calculatingnearestturbine: false});
                    this.setPage(PAGE.NEARESTTURBINE_OVERVIEW);
                })      
            });
            
        } else {
            if ((this.props.global.startinglat !== null) && (this.props.global.startinglng !== null)) 
            {
                this.setState({calculatingposition: false, calculatingnearestturbine: true});
                this.props.fetchNearestTurbine({lat: this.props.global.startinglat, lng: this.props.global.startinglng}).then(() => {
                  this.setState({calculatingnearestturbine: false});
                  this.setPage(PAGE.NEARESTTURBINE_OVERVIEW);
                  if (this.mapRef.current !== null) {
                    const map = this.mapRef.current.getMap();
                    this.updateCurrentWindTurbines(map);
                  }
                })
            } else {
                if (navigator.geolocation) {
                    this.setState({calculatingposition: true});
                    navigator.geolocation.getCurrentPosition(this.foundCurrentPosition, this.notfoundCurrentPosition);
                } else {
                    this.setState({calculatingposition: false});        
                }    
            }
        }
    }
  
    foundCurrentPosition = (position) => {
        this.setState({calculatingposition: false, calculatingnearestturbine: true});
        console.log("Identified position");
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.props.fetchNearestTurbine({lat: latitude, lng: longitude}).then(() => {
          // console.log({
          //   startinglat: this.props.global.startinglat,
          //   startinglng: this.props.global.startinglng,
          //   currentlat: this.props.global.currentlat,
          //   currentlng: this.props.global.currentlng,
          //   turbinelat: this.props.global.turbinelat,
          //   turbinelng: this.props.global.turbinelng,
          // })
          if (this.mapRef.current !== null) {
            const map = this.mapRef.current.getMap();
            this.updateCurrentWindTurbines(map);
          }
          this.setState({calculatingnearestturbine: false});
          this.setPage(PAGE.NEARESTTURBINE_OVERVIEW);
        })
    }

    foundCurrentPositionLooseVote = (position) => {
      this.props.setGlobalState({startinglat: position.coords.latitude, startinglng: position.coords.longitude});
      this.setState({calculatingposition: false, showloosevote: true});
    }

    notfoundCurrentPosition = () => {
      this.loadingurl = false;
      this.setState({calculatingposition: false, positionerror: true});

        console.log("Unable to retrieve your location");
    }

    togglePlanningConstraint = (planningconstraint) => {
      var planningconstraints = this.props.global.planningconstraints;
      // // Selecting 'all' will either turn off all other layers or turn on all other layers
      // if (planningconstraint === 'all') {
      //   // planningconstraints['all'] = !(planningconstraints[planningconstraint]);
      //   var planningconstraints_list = Object.keys(PLANNING_CONSTRAINTS);
      //   for(var i = 0; i < planningconstraints_list.length; i++) {
      //     var key = planningconstraints_list[i];
      //     planningconstraints[key] = !this.props.global.planningconstraints['all'];
      //   }
      // } else {
      //   planningconstraints['all'] = false;
      //   planningconstraints[planningconstraint] = !(planningconstraints[planningconstraint]);
      // }
      planningconstraints[planningconstraint] = !(planningconstraints[planningconstraint]);
      this.props.setGlobalState({planningconstraints: planningconstraints}).then(() => {
        mapRefreshPlanningConstraints(
          this.props.global.showconstraints, 
          this.props.global.planningconstraints,
          this.mapRef.current.getMap());
      });
    }

    checkLocation = () => {
      const map = this.mapRef.current.getMap();
      if ((this.props.global.startinglat !== undefined) && (this.props.global.startinglng)) {
        if (!this.state.locationinitialized) {
          this.setButton(map, 'message', true);
          this.setState({locationinitialized: true});
        }
      } else {
        if (this.state.locationinitialized) {
          this.setButton(map, 'message', false);
          this.setState({locationinitialized: false});
        }
      }
    }

    onGeolocate = (e) => {
      if (e.coords !== undefined) {
          if (this.props.global.startinglat === null) {
            this.props.setGlobalState({startinglat: e.coords.latitude, startinglng: e.coords.longitude}).then(() => {
              this.checkLocation();
            });
          }
      }
    }

    startVote = () => {
      if ((this.props.global.page === PAGE.EXPLORE) && (this.props.global.turbinelat === null)) {
        if (this.props.global.startinglat === null) {
          if (navigator.geolocation) {
            this.setState({calculatingposition: true});
            navigator.geolocation.getCurrentPosition(this.foundCurrentPositionExploreVote, this.notfoundCurrentPosition);
          } else {
            this.setState({calculatingposition: false});        
          }    
        } else this.showSelectSite();

        return;
      } 
      

      this.setState({
        showtooltipvote: false,
        name: '',
        email: '',
        contactchecked: true,
        cookieschecked: true, 
        showvote: true,
        isValidName: false,
        isValidEmail: false,
        isTouchedName: false,
        isTouchedEmail: false,
        recaptcha: undefined,
        recaptchaError: ''
      });

    }

    foundCurrentPositionExploreVote = (position) => {
      this.props.setGlobalState({startinglat: position.coords.latitude, startinglng: position.coords.longitude});
      this.setState({calculatingposition: false});
      this.showSelectSite();
    }

    showSelectSite = () => {
      this.setState({showselectsite: true});
      mapRefreshPlanningConstraints(
        true, 
        {
          "all": true,
          "wind": false,
          "landscape": false,
          "heritage": false,
          "residential": false,
          "ecology": false,
          "safety": false,
          "aviation_mod": false
        },
        this.mapRef.current.getMap());

    }

    editTurbine = () => {
      var turbineparameters = this.getTurbineFromName(this.props.global.windturbine);
      this.setState({windturbine: this.props.global.windturbine, turbineparameters: turbineparameters, hubheight: this.props.global.turbinetowerheight.toString(), hubheights: turbineparameters.hubheights, showturbine: true});
    }

    setTurbine = () => {
      this.props.setGlobalState({windturbine: this.state.windturbine, turbinetowerheight: this.state.hubheight, turbinebladeradius: (this.state.turbineparameters['Rotor diameter'] / 2)}).then(() => {
        this.refreshVisibility();
        var map = this.mapRef.current.getMap();
        this.updateCurrentWindTurbines(map);
      });
      this.setState({showturbine: false});
    }

    getTurbineFromName = (name) => {
      var turbineparameters = [];
      for(var i = 0; i < this.windturbines.length; i++) {
        if (this.windturbines[i].Name === name) {
          turbineparameters = this.windturbines[i];
          turbineparameters['hubheights'] = turbineparameters['Hub heights'].split(';');
          break;
        }
      }
      return turbineparameters;
    }

    changeTurbineType = (e) => {
      var turbinename = e.detail.value;
      var turbineparameters = this.getTurbineFromName(turbinename);
      this.setState({windturbine: turbinename, turbineparameters: turbineparameters, hubheight: turbineparameters.hubheights[0], hubheights: turbineparameters.hubheights});
    }

    changeTurbineHeight = (e) => {
      var turbineheight = e.detail.value;
      this.setState({hubheight: turbineheight});
    }

    render() {
        return (
          <>
          <IonApp>
          <IonHeader translucent="true" className="ion-no-border">
            <Toolbar parent={this} />
          </IonHeader>
          <IonContent fullscreen="true">

            <IonAlert isOpen={this.state.calculatingposition} backdropDismiss={false} header="Calculating your position..." />            
            <IonAlert isOpen={this.loadingurl} backdropDismiss={true} header="Loading wind site location..." />            
            <IonAlert isOpen={this.state.calculatingnearestturbine} backdropDismiss={false} header={"Searching " + String(TOTAL_SITES) + " locations for nearest optimal wind site..."} />            
            <IonAlert isOpen={this.state.generatingfile} backdropDismiss={false} header={"Generating new file, please wait... " + String(this.state.progress) + "%"} />         
            <IonAlert isOpen={this.state.positionerror} backdropDismiss={false} header="Please enable location access to use this feature" onDidDismiss={() => this.setState({positionerror: false})} buttons={['OK']}/>            

            <IonModal className="wewantwind-modal" isOpen={this.state.showturbine} onDidDismiss={() => this.setState({showturbine: false})}>
            <IonHeader>
                <IonToolbar className="wob-toolbar">
                  <IonTitle mode="ios">Edit wind turbine</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <IonList lines="none">
                  <IonItem>
                    <IonSelect label="Wind turbine" value={this.state.windturbine} onIonChange={this.changeTurbineType}>
                    {this.windturbines.map((turbine, index) => {
                      return (
                        <IonSelectOption value={turbine.Name} key={index}>{turbine.Name}</IonSelectOption>
                    );
                    })}
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonSelect label="Hub height" value={this.state.hubheight} onIonChange={this.changeTurbineHeight}>
                    {this.state.hubheights.map((hubheight, index) => {
                      return (
                        <IonSelectOption value={hubheight} key={index}>{hubheight} metres</IonSelectOption>
                    );
                    })}
                    </IonSelect>
                  </IonItem>
                  {(this.state.turbineparameters['Wind class']) ? (
                    <IonItem>
                      <IonGrid class="ion-no-padding">
                        <IonRow>
                        <IonCol size="6" style={{textAlign: "left"}}><IonText class="ion-no-margin">Wind class</IonText></IonCol>
                        <IonCol size="6" style={{textAlign: "right"}}><IonText class="ion-no-margin">{this.state.turbineparameters['Wind class']}</IonText></IonCol>
                        </IonRow>
                      </IonGrid>
                      </IonItem>
                  ) : null}
                  {(this.state.turbineparameters['Power']) ? (
                    <IonItem>
                      <IonGrid class="ion-no-padding">
                        <IonRow>
                        <IonCol size="6" style={{textAlign: "left"}}><IonText class="ion-no-margin">Power</IonText></IonCol>
                        <IonCol size="6" style={{textAlign: "right"}}><IonText class="ion-no-margin">{this.state.turbineparameters['Power']} mW</IonText></IonCol>
                        </IonRow>
                      </IonGrid>
                      </IonItem>
                  ) : null}
                  {(this.state.turbineparameters['Sound power']) ? (
                    <IonItem>
                      <IonGrid class="ion-no-padding">
                        <IonRow>
                        <IonCol size="6" style={{textAlign: "left"}}><IonText class="ion-no-margin">Sound power</IonText></IonCol>
                        <IonCol size="6" style={{textAlign: "right"}}><IonText class="ion-no-margin">{this.state.turbineparameters['Sound power']} dB</IonText></IonCol>
                        </IonRow>
                      </IonGrid>
                      </IonItem>
                  ) : null}
                  {(this.state.turbineparameters['Rotor diameter']) ? (
                    <IonItem>
                      <IonGrid class="ion-no-padding">
                        <IonRow>
                        <IonCol size="6" style={{textAlign: "left"}}><IonText class="ion-no-margin">Rotor diameter</IonText></IonCol>
                        <IonCol size="6" style={{textAlign: "right"}}><IonText class="ion-no-margin">{this.state.turbineparameters['Rotor diameter']} metres</IonText></IonCol>
                        </IonRow>
                      </IonGrid>
                      </IonItem>
                  ) : null}
                  {(this.state.turbineparameters['Carbon footprint']) ? (
                    <IonItem>
                      <IonGrid class="ion-no-padding">
                        <IonRow>
                        <IonCol size="6" style={{textAlign: "left"}}><IonText class="ion-no-margin">Carbon footprint</IonText></IonCol>
                        <IonCol size="6" style={{textAlign: "right"}}><IonText class="ion-no-margin">{this.state.turbineparameters['Carbon footprint']}g CO<sub>2</sub>e/kWh</IonText></IonCol>
                        </IonRow>
                      </IonGrid>
                      </IonItem>
                  ) : null}
                  <IonItem>
                    <IonText style={{margin: "auto", paddingTop: "10px"}}>  
                      <IonButton onClick={() => {this.setState({showturbine: false})}} color="light" shape="round" size="medium" fill="solid">Cancel</IonButton>
                      <IonButton onClick={() => {this.setTurbine()}} color="success" shape="round" size="medium" fill="solid">Set turbine</IonButton>
                    </IonText>
                  </IonItem>
                </IonList>
              </IonContent>
            </IonModal>

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

            <IonModal className="wewantwind-modal" isOpen={this.state.showvote} onDidDismiss={() => this.setState({showvote: false})}>
              <IonHeader>
                <IonToolbar className="wob-toolbar">
                  <IonTitle mode="ios">Cast your vote</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <IonList lines="none" style={{paddingTop: "10px"}}>
                  <IonItem>
                    <IonText className="instruction-text">Enter your details to vote for current wind site. We will then email you a link to confirm your vote. 
                    After you've confirmed your vote, the location of voted turbine will be added to map.</IonText>
                  </IonItem>
                  <IonItem>
                    <IonText className="instruction-text" style={{marginTop: "10px", paddingBottom: "0px"}}><b>Only cast one vote per person / email address.</b> You can reallocate your single vote to a different turbine site at any time.</IonText>
                  </IonItem>
                </IonList>
                <IonList lines="none">
                  <IonItem>
                    <IonInput 
                      errorText="Enter your name" 
                      className={`${this.state.isValidName && 'ion-valid'} ${this.state.isValidName === false && 'ion-invalid'} ${this.state.isTouchedName && 'ion-touched'}`} 
                      label="Name" 
                      labelPlacement="stacked" 
                      placeholder="Enter name" 
                      onIonInput={(event) => this.validateName(event)}
                      onIonBlur={() => {this.setState({isTouchedName: true})}}
                      ></IonInput>
                  </IonItem>                
                  <IonItem>
                    <IonInput 
                      errorText="Enter valid email address" 
                      className={`${this.state.isValidEmail && 'ion-valid'} ${this.state.isValidEmail === false && 'ion-invalid'} ${this.state.isTouchedEmail && 'ion-touched'}`} 
                      label="Email address" 
                      labelPlacement="stacked" 
                      placeholder="Enter email address" 
                      onIonInput={(event) => this.validateEmail(event)}
                      onIonBlur={() => {this.setState({isTouchedEmail: true})}}
                      ></IonInput>
                  </IonItem>   
                </IonList>
                <IonList lines="none">
                  <IonItem className="checkbox-item">
                    <IonCheckbox checked={this.state.contactchecked} onIonChange={(e) => {this.setState({contactchecked: !this.state.contactchecked})}} labelPlacement="end">
                    <span className="wrap">Allow other users to contact me via this site. Note: we will <b>never</b> publish or pass on your email address without your express permission.</span>
                    </IonCheckbox>
                  </IonItem>
                  {/* <IonItem className="checkbox-item">
                    <IonCheckbox checked={this.state.cookieschecked} onIonChange={(e) => {this.setState({cookieschecked: !this.state.cookieschecked})}} labelPlacement="end">
                    <span className="wrap">Accept browser cookies. This helps track whether you have already voted for a specific turbine site.</span>
                    </IonCheckbox>
                  </IonItem> */}

                  {(this.state.recaptchaError !== '') ? (
                  <IonItem color="danger">
                  <IonText>{this.state.recaptchaError}</IonText>
                  </IonItem>
                  ) : null}
                  <IonItem className={this.recaptcha ? 'ion-no-padding ion-invalid': 'ion-no-padding ion-valid'} style={{paddingTop: "0px"}}>
                      <ReCAPTCHA sitekey={process.env.REACT_APP_GOOGLE_RECAPTCHA_SITE_KEY} onChange={this.verifyCallback}/>
                  </IonItem>

                  <IonItem>
                    <IonText style={{margin: "auto", paddingTop: "10px"}}>  
                      <IonButton onClick={() => {this.setState({showvote: false})}} color="light" shape="round" size="medium" fill="solid">Cancel</IonButton>
                      <IonButton onClick={() => {this.castVote()}} color="success" shape="round" size="medium" fill="solid">Submit vote</IonButton>
                    </IonText>
                  </IonItem>
                </IonList>
              </IonContent>
            </IonModal>

            <IonModal className="wewantwind-modal" isOpen={this.state.showloosevote} onDidDismiss={() => this.setState({showloosevote: false})}>
              <IonHeader>
                <IonToolbar className="wob-toolbar">
                  <IonTitle mode="ios">Cast your vote</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <IonList lines="none" style={{paddingTop: "10px"}}>
                  <IonItem>
                    <IonText className="instruction-text">Enter your details to cast a vote for the clicked site (<i>{(this.state.loosevote) ? (this.state.loosevote['lat'].toFixed(5) + "°N, " + this.state.loosevote['lng'].toFixed(5) + "°E") : null}</i>). We will email you a link to confirm your vote.</IonText>
                  </IonItem>
                  <IonItem>
                    <IonText className="instruction-text" style={{marginTop: "10px"}}><b>If you have already voted for another site, your vote will be switched to this site.</b></IonText>
                  </IonItem>
                </IonList>
                <IonList lines="none">
                  <IonItem>
                    <IonInput 
                      errorText="Enter your name" 
                      className={`${this.state.isValidName && 'ion-valid'} ${this.state.isValidName === false && 'ion-invalid'} ${this.state.isTouchedName && 'ion-touched'}`} 
                      label="Name" 
                      labelPlacement="stacked" 
                      placeholder="Enter name" 
                      onIonInput={(event) => this.validateName(event)}
                      onIonBlur={() => {this.setState({isTouchedName: true})}}
                      ></IonInput>
                  </IonItem>                
                  <IonItem>
                    <IonInput 
                      errorText="Enter valid email address" 
                      className={`${this.state.isValidEmail && 'ion-valid'} ${this.state.isValidEmail === false && 'ion-invalid'} ${this.state.isTouchedEmail && 'ion-touched'}`} 
                      label="Email address" 
                      labelPlacement="stacked" 
                      placeholder="Enter email address" 
                      onIonInput={(event) => this.validateEmail(event)}
                      onIonBlur={() => {this.setState({isTouchedEmail: true})}}
                      ></IonInput>
                  </IonItem>   
                </IonList>
                <IonList lines="none">
                  <IonItem className="checkbox-item">
                    <IonCheckbox checked={this.state.contactchecked} onIonChange={(e) => {this.setState({contactchecked: !this.state.contactchecked})}} labelPlacement="end">
                    <span className="wrap">Allow other users to contact me via this site. Note: we will <b>never</b> publish or pass on your email address without your express permission.</span>
                    </IonCheckbox>
                  </IonItem>
                  {/* <IonItem className="checkbox-item">
                    <IonCheckbox checked={this.state.cookieschecked} onIonChange={(e) => {this.setState({cookieschecked: !this.state.cookieschecked})}} labelPlacement="end">
                    <span className="wrap">Accept browser cookies. This helps track whether you have already voted for a specific turbine site.</span>
                    </IonCheckbox>
                  </IonItem> */}

                  {(this.state.recaptchaError !== '') ? (
                  <IonItem color="danger">
                  <IonText>{this.state.recaptchaError}</IonText>
                  </IonItem>
                  ) : null}
                  <IonItem className={this.recaptcha ? 'ion-no-padding ion-invalid': 'ion-no-padding ion-valid'} style={{paddingTop: "0px"}}>
                      <ReCAPTCHA sitekey={process.env.REACT_APP_GOOGLE_RECAPTCHA_SITE_KEY} onChange={this.verifyCallback}/>
                  </IonItem>

                  <IonItem>
                    <IonText style={{margin: "auto", paddingTop: "10px"}}>  
                      <IonButton onClick={() => {this.setState({showloosevote: false})}} color="light" shape="round" size="medium" fill="solid">Cancel</IonButton>
                      <IonButton onClick={() => {this.castLooseVote()}} color="success" shape="round" size="medium" fill="solid">Submit vote</IonButton>
                    </IonText>
                  </IonItem>
                </IonList>
              </IonContent>
            </IonModal>

            <IonModal className="wewantwind-modal" isOpen={this.state.showmessage} onDidDismiss={() => this.setState({showmessage: false})}>
              <IonHeader>
                <IonToolbar className="wob-toolbar">
                  <IonTitle mode="ios">Connect with users</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <IonList lines="none" style={{paddingTop: "10px", paddingBottom: "0px"}}>
                  <IonItem>
                    <IonText className="instruction-text"><b>{ this.props.global.localpeople } contactable user(s)</b> within {LOCAL_DISTANCE} miles of you. 
                    You can send them an introductory message <i>containing your name and email address</i> to connect with them. 
                    We will request your confirmation via email before messaging them.</IonText>
                  </IonItem>
                </IonList>
                <IonList lines="none">
                  <IonItem>
                    <IonInput 
                      errorText="Enter your name" 
                      className={`${this.state.isValidName && 'ion-valid'} ${this.state.isValidName === false && 'ion-invalid'} ${this.state.isTouchedName && 'ion-touched'}`} 
                      label="Name" 
                      labelPlacement="stacked" 
                      placeholder="Enter name" 
                      onIonInput={(event) => this.validateName(event)}
                      onIonBlur={() => {this.setState({isTouchedName: true})}}
                      ></IonInput>
                  </IonItem>                
                  <IonItem>
                    <IonInput 
                      errorText="Enter valid email address" 
                      className={`${this.state.isValidEmail && 'ion-valid'} ${this.state.isValidEmail === false && 'ion-invalid'} ${this.state.isTouchedEmail && 'ion-touched'}`} 
                      label="Email address" 
                      labelPlacement="stacked" 
                      placeholder="Enter email address" 
                      onIonInput={(event) => this.validateEmail(event)}
                      onIonBlur={() => {this.setState({isTouchedEmail: true})}}
                      ></IonInput>
                  </IonItem>
                  <IonItem>
                    <IonText className="instruction-text" style={{fontSize: "70%", paddingTop: "5px", paddingBottom: "10px", color: "#666"}}>
                      <b>Content of introductory email: </b> Dear [Recipient's name], The following user(s) are within {LOCAL_DISTANCE} miles of you and would like to connect with local wewantwind.org users: 
                    [Your name and email address as supplied above]. 
                  To contact any of them about either setting up a community wind group or getting involved with an existing group, drop them an email.</IonText>
                  </IonItem>
                </IonList>
                <IonList lines="none">
                  {(this.state.recaptchaError !== '') ? (
                  <IonItem color="danger">
                  <IonText>{this.state.recaptchaError}</IonText>
                  </IonItem>
                  ) : null}
                  <IonItem className={this.recaptcha ? 'ion-no-padding ion-invalid': 'ion-no-padding ion-valid'} style={{paddingTop: "0px"}}>
                    <ReCAPTCHA sitekey={process.env.REACT_APP_GOOGLE_RECAPTCHA_SITE_KEY} onChange={this.verifyCallback}/>
                  </IonItem>

                  <IonItem>
                    <IonText style={{margin: "auto", paddingTop: "10px"}}>  
                      <IonButton onClick={() => {this.setState({showmessage: false})}} color="light" shape="round" size="medium" fill="solid">Cancel</IonButton>
                      <IonButton onClick={() => {this.sendMessage()}} color="success" shape="round" size="medium" fill="solid">Send intro</IonButton>
                    </IonText>
                  </IonItem>
                </IonList>
              </IonContent>
            </IonModal>

            <IonModal className="wewantwind-modal" isOpen={this.state.showshare} onDidDismiss={() => this.setState({showshare: false})}>
              <IonHeader>
                <IonToolbar className="wob-toolbar">
                  <IonTitle mode="ios">Share wind site</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <IonList lines="none">
                  <IonItem>
                    <IonInput 
                      label="Shareable link"
                      labelPlacement="stacked"
                      placeholder="" 
                      value={window.location.href}
                      />
                  </IonItem> 
                  <IonItem>
                    <IonButton color="success" size="medium" fill="solid" shape="round" onClick={() => {navigator.clipboard.writeText(window.location.href);}}>Copy link</IonButton>
                  </IonItem> 
                  <IonItem>
                    <IonInput 
                      errorText="Enter valid email address" 
                      className={`${this.state.isValidEmail && 'ion-valid'} ${this.state.isValidEmail === false && 'ion-invalid'} ${this.state.isTouchedEmail && 'ion-touched'}`} 
                      label="Send link to user" 
                      labelPlacement="stacked" 
                      placeholder="Enter email address" 
                      onIonInput={(event) => this.validateEmail(event)}
                      onIonBlur={() => {this.setState({isTouchedEmail: true})}}
                      ></IonInput>
                  </IonItem>
                </IonList>
                <IonList lines="none">
                  {(this.state.recaptchaError !== '') ? (
                  <IonItem color="danger">
                  <IonText>{this.state.recaptchaError}</IonText>
                  </IonItem>
                  ) : null}
                  <IonItem className={this.recaptcha ? 'ion-no-padding ion-invalid': 'ion-no-padding ion-valid'} style={{paddingTop: "0px"}}>
                    <ReCAPTCHA sitekey={process.env.REACT_APP_GOOGLE_RECAPTCHA_SITE_KEY} onChange={this.verifyCallback}/>
                  </IonItem>

                  <IonItem>
                    <IonText style={{margin: "auto", paddingTop: "10px"}}>  
                      <IonButton onClick={() => {this.setState({showshare: false})}} color="light" shape="round" size="medium" fill="solid">Cancel</IonButton>
                      <IonButton onClick={() => {this.sendShare()}} color="success" shape="round" size="medium" fill="solid">Send link</IonButton>
                    </IonText>
                  </IonItem>
                </IonList>
              </IonContent>
            </IonModal>

            {((this.props.global.page === PAGE.HOME) || (this.props.global.page === PAGE.ABOUT)) ? (
              <>
              {(this.props.global.page === PAGE.HOME) ? (
                <div className="centred-container background-image">
                    <IonGrid>
                        <IonRow>
                        <IonCol size="12" style={{textAlign: "center"}}>
                            <IonText className="wewantwind-largetext"><span style={{color:"#F5C242"}}>we</span><span style={{color:"#D8DFCE"}}>want</span><span style={{color:"#FFF"}}>wind</span></IonText>
                        </IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="12" style={{textAlign: "center"}}>
                            <div className="wewantwind-bodyarea">
                              <IonText className="wewantwind-bodytext">Find potential wind sites, vote for sites and get started creating a community wind project!</IonText>
                            </div>
                          </IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="12" style={{textAlign: "center"}}>
                            <IonButton shape="round" onClick={() => {this.selectNearestWindturbine()}}>Find nearest site</IonButton>
                          </IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="12" style={{textAlign: "center"}}>
                          <a onClick={() => {this.setPage(PAGE.EXPLORE)}} className="wewantwind-link">
                              <IonButton shape="round">Explore</IonButton>
                          </a>
                          </IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="12" style={{textAlign: "center"}}>
                          <a target="_new" href="https://ckan.wewantwind.org" className="wewantwind-link">
                              <IonButton shape="round">Open Data</IonButton>
                          </a>
                          </IonCol>
                        </IonRow>
                    </IonGrid>
                </div>
              ) : (
                <div className="centred-container background-image">
                    <IonGrid>
                        <IonRow>
                        <IonCol size="12" style={{textAlign: "center"}}>
                            <IonText className="wewantwind-largetext"><span style={{color:"#F5C242"}}>we</span><span style={{color:"#D8DFCE"}}>want</span><span style={{color:"#FFF"}}>wind</span></IonText>
                        </IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="12" style={{textAlign: "center"}}>
                            <div className="wewantwind-bodyarea">
                              <IonText className="wewantwind-bodytext"><b>wewantwind.org</b> was created by Stefan Haselwimmer to help communities get started with community wind.<br/><br/>
                              To contact us, email <b>info@wewantwind.org</b>
                              <br/><br/>
                              <a target="_new" href="https://www.youtube.com/watch?v=8FFPjcLVpyU" style={{textDecoration: "none", color: "wheat"}} >Click here for video demo</a>
                              </IonText>
                            </div>
                          </IonCol>
                        </IonRow>
                        <IonRow className="ion-align-items-center">
                          <IonCol size="12" style={{textAlign: "center"}}>
                          <a href="mailto:info@wewantwind.org" className="wewantwind-link">
                              <IonButton shape="round">Email us</IonButton>
                          </a>
                          </IonCol>
                        </IonRow>
                    </IonGrid>
                </div>
              )}              
              </>
            ) : (

                <div className="map-wrap">

                  <Toaster position="top-center" containerStyle={{top: 50}}/>

                  {this.showSubMap(this.props.global.page) ? (
                  <div className="submap">
                      <div className="turbine-distance">
                      Turbine distance: {this.props.global.distance_mi.toFixed(1) + ' miles'} / {this.props.global.distance_km.toFixed(1) + ' km'}
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
                          <img alt="Wind turbine" width="40" src="./static/icons/windturbine_black.png" />
                      </Marker>                  
                      <Marker onDragEnd={this.onEyeMarkerDragEnd} longitude={this.props.global.currentlng} latitude={this.props.global.currentlat} draggable={this.state.draggablesubmap} anchor="center" >
                          <img alt="Your location" width="40" src="./static/icons/eye.png" />
                      </Marker>                  
                      </Map>
      
                  </div>
      
                  ) : null}
      
                  {this.showMainMap(this.props.global.page) ? (
                  <div className="map-wrap">

                      {(this.props.global.windspeed !== null) ? (
                      <div style={{zIndex:1000, position: "absolute", top: "60px", width: "100%"}}>
                        <IonGrid>
                          <IonRow className="ion-align-items-center">
                            <IonCol size="12" style={{textAlign: "center"}}>
                              <div className="horizontal-centred-container">
                                <div className="wewantwind-infotab">
                                Wind speed:&nbsp;<b>{this.props.global.windspeed} m/s</b>&nbsp;{(this.props.global.windspeed < 5) ? ('(too low for turbines)'): null}
                                </div>
                              </div>
                            </IonCol>
                          </IonRow>
                        </IonGrid>
                      </div>
                      ) : null}

                      <div style={{ height: "100%" }}>

                        {((this.props.global.page !== PAGE.HOME) && (this.props.global.page !== PAGE.NEARESTTURBINE_OVERVIEW)) ? (
                          <div className="turbine-button">
                              <IonGrid>
                                  <IonRow className="ion-align-items-center">
                                  <IonCol size="12" style={{textAlign: "center"}}>
                                      <div className="horizontal-centred-container">
                                          <a onClick={() => {this.editTurbine()}} className="wewantwind-link">
                                              <IonButton shape="round" color="dark" size="small">{this.props.global.windturbine} - {this.props.global.turbinetowerheight} m</IonButton>
                                          </a>
                                      </div>
                                  </IonCol>
                                  </IonRow>
                              </IonGrid>
                          </div>
                        ) : null}

                        {(this.props.global.page === PAGE.NEARESTTURBINE_OVERVIEW) ? (
                            <>
                                <div className="turbine-distance-bottom">
                                    <div>
                                        <img className="key-image" style={{verticalAlign: "middle"}} alt="Your location" width="40" src="./static/icons/eye.png" /> 
                                        is current position, drag
                                        <img className="key-image" style={{verticalAlign: "middle"}} alt="Your location" width="40" src="./static/icons/windturbine_black.png" />
                                        to move.  
                                        Turbine distance: <b>{this.props.global.distance_mi.toFixed(1) + ' miles'} / {this.props.global.distance_km.toFixed(1) + ' km'}</b>
                                    </div>
                                </div>

                                <div style={{zIndex:1000, position: "absolute", top: "80px", width: "100%"}}>
                                    <IonGrid>
                                        <IonRow className="ion-align-items-center">
                                        <IonCol size="12" style={{textAlign: "center"}}>
                                            <div className="horizontal-centred-container">
                                                <a onClick={() => {this.setPage(PAGE.NEARESTTURBINE)}} className="wewantwind-link">
                                                    <IonButton shape="round" color="success">Go to next stage</IonButton>
                                                </a>
                                            </div>
                                        </IonCol>
                                        </IonRow>
                                    </IonGrid>
                                </div>



                            </>
                        ) : null}

                            {(this.state.showsite) ? (
                            <div className="turbine-distance-bottom">
                                <div>
                                    Click map to select site position
                                </div>
                            </div>
                            ) : null}

                            {(this.state.showselectsite) ? (
                            <div className="turbine-distance-bottom">
                                <div>
                                    Click map to select site position to vote for
                                </div>
                            </div>
                            ) : null}


                            <Map ref={this.mapRef}
                              width="100vw"
                              height="100vh"
                              onLoad={this.onMapLoad} 
                              onMouseEnter={this.onMouseEnter}
                              onMouseMove={this.onMouseMove}
                              onMouseLeave={this.onMouseLeave}   
                              onClick={this.onClick}    
                              onDrag={this.onDrag}
                              onStyleData={this.onStyleData}
                              // onRender={this.onRender}
                              onMoveEnd={this.onMapMoveEnd}
                              onIdle={this.onIdle}
                              interactiveLayerIds={this.interactivelayers}
                              mapStyle={this.explorelayer}
                              terrain={{source: "terrainSource", exaggeration: 1.1 }}
                              attributionControl={false}
                              minZoom="5"
                              maxBounds={DEFAULT_MAXBOUNDS}
                              initialViewState={{
                              longitude: this.props.global.currentlng,
                              latitude: this.props.global.currentlat,
                              maxPitch: 85
                              }} >
                                <Tooltip id="ctrlpanel-tooltip" place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-visibility" isOpen={this.state.showtooltipvisibility} place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-site" isOpen={this.state.showtooltipsite} place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-vote" isOpen={this.state.showtooltipvote} place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-download" isOpen={this.state.showtooltipdownload} place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-message" isOpen={this.state.showtooltipmessage} place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-share" isOpen={this.state.showtooltipshare} place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-fly" isOpen={this.state.showtooltipfly} place="right" variant="light" style={{fontSize: "120%"}} />
                                <Tooltip id="ctrlpanel-tooltip-record" isOpen={this.state.showtooltiprecord} place="right" variant="light" style={{fontSize: "120%"}} />

                                {(this.props.global.page === PAGE.EXPLORE) ? (
                                  <GeolocateControl onGeolocate={this.onGeolocate} position="top-left" />
                                ) : null}
                                <Popup longitude={0} latitude={0} ref={this.popupRef} closeButton={false} closeOnClick={false} />

                                {/* <Canvas dpr={[1, 2]} ref={this.threeRef} latitude={50} longitude={-5} altitude={0}>
                                    <Coordinates latitude={this.props.global.turbinelat} longitude={this.props.global.turbinelng} altitude={this.state.altitude}>
                                      <ambientLight intensity={Math.PI / 8} />
                                      <pointLight position={[-200, -200, 400]} decay={0} intensity={0.3 * Math.PI} />
                                      <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]}/>
                                      <object3D visible={(this.props.global.page !== PAGE.NEARESTTURBINE_OVERVIEW)} scale={25} rotation={[0, 1, 0]}>
                                          <WindTurbine container={this}/>
                                      </object3D>
                                    </Coordinates>
                                    {this.state.currentwindturbines.map((turbine, index) => 
                                      (
                                        <Coordinates key={index} latitude={turbine[1]} longitude={turbine[0]} altitude={this.state.currentaltitudes[index]}>
                                          <ambientLight intensity={Math.PI / 8} />
                                          <pointLight position={[-200, -200, 400]} decay={0} intensity={0.3 * Math.PI} />
                                          <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]}/>
                                          <object3D visible="true" scale={25} rotation={[0, 1, 0]}>
                                              <WindTurbine container={this}/>
                                          </object3D>
                                        </Coordinates>
                                      )
                                    )}
                                </Canvas> */}

                                <Marker 
                                    style={{display: (this.showMarkers(this.props.global.page) && (this.state.showmarker)) ? 'block': 'none'}} 
                                    onDragEnd={this.onTurbineMarkerDragEnd} 
                                    onClick={this.onClickMarker} 
                                    longitude={this.props.global.turbinelng} 
                                    latitude={this.props.global.turbinelat} 
                                    draggable="true" 
                                    anchor="bottom" >
                                        <img alt="Wind turbine" width="40" src="./static/icons/windturbine_black.png" />
                                </Marker>    

                                <Marker
                                    style={{display: (this.showMarkers(this.props.global.page) && (this.state.showmarker) && (this.props.global.page !== PAGE.EXPLORE)) ? 'block': 'none'}} 
                                    longitude={this.props.global.currentlng} 
                                    latitude={this.props.global.currentlat} anchor="center" >
                                    <img alt="Your location" width="40" src="./static/icons/eye.png" />
                                </Marker>                  
                            </Map>

                      </div>
                  </div>
                  ) : null}
      
                </div>      

            )}
          </IonContent>

        </IonApp>


        {this.props.global.showconstraints ? (
          <div style={{position: "absolute", bottom: "0px", left: "0px", width: "100vw", zIndex: "9999"}}>
            <div style={{marginLeft: "0px", marginRight: "0px", backgroundColor: "#ffffffff"}}>
              <div>
                <IonGrid>
                  <IonRow className="ion-align-items-center ion-justify-content-center">
                    <IonCol size="12" className="planning-key-title-container">
                      <div className="horizontal-centred-container">
                        <IonText className="planning-key-title ">Non-optimal wind sites due to low wind / planning constraints</IonText>
                      </div>
                    </IonCol>
                  </IonRow>
                  <IonRow className="ion-align-items-center ion-justify-content-center">
                    <IonCol size="auto">
                      <div style={{paddingRight: "20px"}}>
                        {Object.keys(PLANNING_CONSTRAINTS).map((planningconstraint, index) => {
                          return (
                            <span 
                              key={index} 
                              onClick={() => this.togglePlanningConstraint(planningconstraint)} 
                              className="planning-key-item"
                              style={{
                                opacity: (this.props.global.planningconstraints[planningconstraint] ? 1 : 0.4),
                              }}>
                              <div style={{width: "25px", height: "10px", marginRight: "5px", display: "inline-block", backgroundColor: PLANNING_CONSTRAINTS[planningconstraint]['colour']}} />
                              {PLANNING_CONSTRAINTS[planningconstraint]['description']}
                            </span>  
                          )
                        })}
                      </div>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </div>
              <div className="planning-key-footnote">Click colour or label to toggle on/off. Source data copyright of multiple organisations - see full list of source datasets at <a href="https://ckan.wewantwind.org" target="_new" style={{color: "black"}}>ckan.wewantwind.org</a></div>
            </div>
          </div>
        ) : null}

        <IonAlert
          id="alert-modal"
          isOpen={this.state.alertIsOpen}
          header="Problem with location"
          message={this.state.alertText}
          buttons={['OK']}
          onDidDismiss={() => this.setState({alertIsOpen: false})} >
        </IonAlert>

        </>


            );
    }
}

export const mapStateToProps = state => {
  return {
    global: state.global
  }
}
    
export const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        setGlobalState: (globalstate) => {
            return dispatch(global.setGlobalState(globalstate, ownProps.history, ownProps.location));
        },  
        setButtonState: (buttonname, buttonstate) => {
          return dispatch(global.setButtonState(buttonname, buttonstate));
        },
        setPage: (page) => {
            return dispatch(global.setPage(page));
        },  
        loadAllWindTurbines: () => {
            return dispatch(global.loadAllWindTurbines());
        },
        fetchNearestTurbine: (position) => {
            return dispatch(global.fetchNearestTurbine(position, ownProps.history, ownProps.location));
        },
        fetchRandomPoint: () => {
            return dispatch(global.fetchRandomPoint());
        },
        fetchVisibility: (params) => {
          return dispatch(global.fetchVisibility(params));
        },
        castVote: (voteparameters) => {
            return dispatch(global.castVote(voteparameters));
        },  
        getLocalPeople: (position) => {
            return dispatch(global.getLocalPeople(position));
        },  
        sendMessage: (messageparameters) => {
            return dispatch(global.sendMessage(messageparameters));
        },  
        sendShare: (shareparameters) => {
          return dispatch(global.sendShare(shareparameters));
        },  
        fetchEntity: (id) => {
            return dispatch(global.fetchEntity({list: false, id: id}));
        },        
    }
}  

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Main));