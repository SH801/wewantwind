import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { ReCaptcha } from 'react-recaptcha-google'
import { 
  IonApp, 
  IonHeader, 
  IonContent, 
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
  IonicSafeString,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { downloadOutline } from 'ionicons/icons';
import toast, { Toaster } from 'react-hot-toast';
import { bearing, centroid } from '@turf/turf';
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Popup, Marker, GeolocateControl } from 'react-map-gl/maplibre';
import { Canvas } from "react-three-map/maplibre";
import maplibregl from '!maplibre-gl'; // eslint-disable-line import/no-webpack-loader-syntax

import { 
  TILESERVER_BASEURL,
  LOCAL_DISTANCE, 
  DEFAULT_MAXBOUNDS, 
  DEFAULT_CENTRE,
  THREED_ZOOM,
  PLANNING_CONSTRAINTS 
} from '../constants';
import { global } from "../actions";
import Toolbar from '../components/toolbar';
import { initShaders, initVertexBuffers } from './webgl';
import { FlyToggle } from '../components/flytoggle';
import { RecordVideo } from '../components/recordvideo';
import { Message } from '../components/message';
import { Grid } from '../components/grid';
import { Wind } from '../components/wind';
import { Spacer } from '../components/spacer';
import { Constraints } from '../components/constraints';
import { mapRefreshPlanningConstraints } from '../functions/map';


const ANIMATION_INTERVAL = 800;

window.Ionic = {
  config: {
    innerHTMLTemplatesEnabled: true
  }
}

function WindTurbine(props) {
  const tower_gltf = useLoader(GLTFLoader, "./static/models/windturbine_tower.gltf");
  const blades_gltf = useLoader(GLTFLoader, "./static/models/windturbine_blades.gltf");
  const turbinemesh = React.useRef();

  useFrame(({ clock }) => {
    const a = clock.getElapsedTime();
    turbinemesh.current.rotation.x = -(1.5 * a);
  });

  return (
    <>
    <mesh onClick={props.container.onClickMarker} position={[0, 2.42, 0]} scale={2}>
      <mesh position={[0, -2.42, 0]}>
        <primitive object={tower_gltf.scene} scale={1} />
      </mesh>
      <mesh ref={turbinemesh} position={[0, 1, 0]}>
        <primitive object={blades_gltf.scene} scale={1} />
      </mesh>
    </mesh>
    </>
  )
}



/**
 * Main template class for App 
 */
class Explore extends Component {

    constructor(props, context) {
      super(props, context);
      this.maxTileCacheSize = this.getMaxTileCacheSize();
      this.onLoadRecaptcha = this.onLoadRecaptcha.bind(this);
      this.verifyCallback = this.verifyCallback.bind(this);
      this.state = {
        maploaded: false, 
        locationinitialized: false,
        icons_white: [],
        iconsloaded_white: false,
        icons_grey: [],
        iconsloaded_grey: false,    
        altitude: null, 
        flying: false, 
        flyingcentre: null, 
        draggablesubmap: true,
        showgrid: false,
        showwind: false,
        showconstraints: false,
        showdownload: false,
        showvote: false,
        showmessage: false,
        showmarker: true,
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
        alertText: ''    
      };
      this.updatealtitude = false;
      this.ignoremovend = false;
      this.mapRef = React.createRef();
      this.threeRef = React.createRef();
      this.popupRef = React.createRef();
      this.style_explore = require('../constants/style_explore.json');
      this.style_planningconstraints_defaults = require('../constants/style_planningconstraints_defaults.json');
      this.style_planningconstraints = this.constructPlanningConstraints(require('../constants/style_planningconstraints.json'));
      this.explorelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_planningconstraints, this.style_explore);
      this.spacer = new Spacer();
      this.flytoggle = new FlyToggle({mapcontainer: this});
      this.recordvideo = new RecordVideo({mapcontainer: this});
      this.message = new Message({mapcontainer: this});
      this.showwind = new Wind({mapcontainer: this});
      this.showconstraints = new Constraints({mapcontainer: this});
      this.showgrid = new Grid({mapcontainer: this});
      this.hoveredPolygonId = null;
    }

    onMapLoad = (event) => {
      
      this.props.setGlobalState({"mapref": this.mapRef});

      var map = this.mapRef.current.getMap();

      map.on('click', 'points', function (e) {
        console.log('clicked on layer', e);
        e.clickOnLayer = true;
      });

      // Only animate turbines on non-iOS platforms due to limited memory on iOS
      var isiOS = this.isiOS();

      // isiOS = true;

      if (!isiOS) {
        console.log("Initializing images...");
        var url = null;
        for(let i = 1; i < 6; i++) {
          url = process.env.PUBLIC_URL + "/static/icons/windturbine_white_animated_" + i.toString() + ".png";
          map.loadImage(url, (error, image) => {
              if (error) throw error;
              var icons_white = this.state.icons_white;
              icons_white[i] = image;
              this.setState({icons_white: icons_white});
              if (i === 5) {
                console.log("Loaded turbine images (white)");
                this.setState({iconsloaded_white: true});
              }
          });            
        }

        for(let i = 1; i < 6; i++) {
          url = process.env.PUBLIC_URL + "/static/icons/windturbine_grey_animated_" + i.toString() + ".png";
          map.loadImage(url, (error, image) => {
              if (error) throw error;
              var icons_grey = this.state.icons_grey;
              icons_grey[i] = image;
              this.setState({icons_grey: icons_grey});
              if (i === 5) {
                console.log("Loaded turbine images (grey)");
                this.setState({loading: false, iconsloaded_grey: true});
              }
          });            
        }
      } else {
        this.setState({loading: false});
      }

      if (!isiOS) setTimeout(this.animateIcons, 1000);

      this.setState({maploaded: true});

      map.addControl(new maplibregl.AttributionControl(), 'bottom-left');
      map.addControl(this.spacer, 'top-right'); 
      map.addControl(this.flytoggle, 'top-right'); 
      map.addControl(this.recordvideo, 'top-right'); 
      map.addControl(this.showwind, 'top-right');
      map.addControl(this.showconstraints, 'top-right');
      map.addControl(this.showgrid, 'top-right');
      let scale = new maplibregl.ScaleControl({
        maxWidth: 160,
        unit: 'imperial',
        style: 'map-scale'
      });
      map.addControl(scale, 'bottom-right');
      this.checkLocation();
    }

    componentDidMount() {
      if (this.captchaRef) {
          this.captchaRef.reset();
      }
    }

    onLoadRecaptcha() {
        if (this.captchaRef) {
            this.captchaRef.reset();
        }
    }

    verifyCallback(recaptchaToken) {
      // console.log("Recaptcha", recaptchaToken)
      this.setState({recaptcha: recaptchaToken, recaptchaError: ''});
    }
  
    onExpiredCaptcha() {
      console.log("Recaptcha expired");
      this.setState({recaptcha: undefined, recaptchaError: ''});
      // this.captchaRef.current.reset();    
      return false;  
    } 

    updateSubmapPosition = () => {
      var cameraposition = this.getCameraPosition();
      this.props.setGlobalState({currentlat: cameraposition.lat, currentlng: cameraposition.lng});
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
        'windspeed',
        'votes',
        'votes_line',
      ].concat(idsinstylesheet);
  
      return planningconstraints;
    }    
    incorporateBaseDomain = (baseurl, planningconstraints, json) => {

      let newjson = JSON.parse(JSON.stringify(json));
      const sources_list = ['openmaptiles', 'terrainSource', 'hillshadeSource', 'allplanningconstraints', 'planningconstraints', 'windspeed', 'renewables', 'grid'];
  
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
      // console.log(cameraToCenterDistance, pixelAltitude, metersInWorldAtLat, worldsize, latOffset, newPixelPoint, newLongLat, lng, lat, zoom, pitch, bearing);
      map.transform.setLocationAtPoint(newLongLat, newPixelPoint);
      map.setBearing(map.getBearing());
    }

    animateIcons = () => {
      // const intervalmsecs = 250;
      const numframes = 5;
      const totalduration = numframes * ANIMATION_INTERVAL;
      setTimeout(this.animateIcons, ANIMATION_INTERVAL);
  
      if ((this.state.iconsloaded_white) && (this.state.iconsloaded_grey)) {
        const currentDate = new Date();
        const milliseconds = currentDate.getTime(); 
        const deltamsecs = milliseconds % totalduration;
        const animationindex = 1 + parseInt(deltamsecs / ANIMATION_INTERVAL);
        if ((this.mapRef !== null) && (this.mapRef.current !== null)) {
          var map = this.mapRef.current.getMap();
          if (map) {
            if ((this.state.icons_white[animationindex] !== undefined) && 
                (this.state.icons_grey[animationindex] !== undefined)) {
              try {
                map.removeImage('windturbine_grey');
              }
              catch(err) {
                console.log(err);
              }    
              if (map.getZoom() > THREED_ZOOM) {
                map.addImage('windturbine_grey', this.state.icons_white[animationindex]);    
              } else {
                map.addImage('windturbine_grey', this.state.icons_grey[animationindex]);    
              }
            }
          }
        }
      }  
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
      if (this.mapRef.current !== null) {
        var map = this.mapRef.current.getMap();
        var zoom = map.getZoom();
        // console.log(zoom);
        var pitch = map.getPitch();
        var bearing = map.getBearing();
        if (zoom < THREED_ZOOM) {
          this.setState({showmarker: true});
          if ((pitch !== 0) || (bearing !== 0)) map.jumpTo({pitch: 0, bearing: 0, duration: 0})
        } else {
          this.setState({showmarker: false});
          if (pitch === 0) map.easeTo({pitch: 85, duration: 1000});
        }
      }
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
        this.setState({flying: true}, () => {  
          var map = this.mapRef.current.getMap();
          var centre = map.getCenter();
          var zoom = map.getZoom();
          if (this.state.centreset) {
            console.log("Centre is set already, using that for flying");
            centre = this.props.global.centre;
            zoom = this.props.global.zoom;
          } 
          this.props.setGlobalState({centre: centre, zoom: zoom}).then(() => {
            this.updateAltitude();
            this.flyingRun();
          });
        });
      }
    }

    flyingStop = () => {
      if (this.mapRef) {
        var map = this.mapRef.current.getMap();
        map.jumpTo({center: map.getCenter(), duration: 0});
        this.setState({flying: false});
      }
    }

    flyingRun = () => {
      var halfinterval = 60000;
      var degreesperiteration = 120;
  
      if (this.mapRef) {
        var map = this.mapRef.current.getMap();
        var newbearing = parseInt(map.getBearing() + degreesperiteration);
        console.log("About to rotateTo", newbearing, this.props.global.centre);
        map.rotateTo(parseFloat(newbearing), {around: this.props.global.centre, easing(t) {return t;}, duration: halfinterval});  
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
      // console.log(this.state.name, this.state.email, this.state.contactchecked, this.state.cookieschecked, this.state.recaptcha);
  
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

    sendMessage = () => {
      // console.log(this.state.name, this.state.email, this.state.contactchecked, this.state.cookieschecked, this.state.recaptcha);
  
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

    checkLocation = () => {
      const map = this.mapRef.current.getMap();
      if ((this.props.global.startinglat !== undefined) && (this.props.global.startinglng)) {
        if (!this.state.locationinitialized) {
          map.addControl(this.message, 'top-left'); 
          this.setState({locationinitialized: true});
        }
      } else {
        if (this.state.locationinitialized) {
          map.removeControl(this.message);
          this.setState({locationinitialized: false});
        }
      }
    }

    onGeolocate = (e) => {
      if (e.coords !== undefined) {
        console.log(e.coords);
          this.props.setGlobalState({startinglat: e.coords.latitude, startinglng: e.coords.longitude}).then(() => {
            this.checkLocation();
          });
      }
    }

    capitalizeFirstLetter(string) {
      return (string.charAt(0).toUpperCase() + string.slice(1)).replaceAll(":", " ");
    }
  
    onMouseEnter = (event) => {
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
          popup.setOffset([0, 0]);
          if (properties['renewabletype'] !== undefined) popup.setOffset([0, -10]);
          if (properties['subtype'] === 'votes') popup.setOffset([0, -30]);
          popup.setLngLat(featurecentroid.geometry.coordinates).setHTML(description).addTo(map);
        }  
      }
    }
  
    onMouseMove = (event) => {
  
      if (event.features.length > 0) {
        if (event.features[0].sourceLayer === 'windspeed') {
          var windspeed = parseFloat(event.features[0].properties['DN'] / 10);
          this.props.setGlobalState({'windspeed': windspeed});
          return;
        }
  
      } 
        
      if (this.hoveredPolygonId) {
        var popup = this.popupRef.current;
        popup.setLngLat(event.lngLat);
      }
    }
  
    onMouseLeave = (event) => {
      this.props.setGlobalState({'windspeed': null});
      var map = this.mapRef.current.getMap();
      var popup = this.popupRef.current;    
      this.hoveredPolygonId = null;
      map.getCanvas().style.cursor = '';
      popup.remove();  
    }
    
    onDrag = (event) => {
      this.setState({centreset: false});  
    }

    onClick = (event) => {
      // User clicks so remove centre
      if (event.clickOnLayer) this.setState({centreset: false});  

      // Don't select features if adding asset
      if (event.features.length > 0) {
        var id = event.features[0]['layer']['id'];
        if ((id === 'constraint_windspeed_fill_colour') ||
            (event.features[0].source === 'planningconstraints') || 
            (event.features[0].sourceLayer === 'landuse')) {
              this.setState(
                {
                  alertIsOpen: true, 
                  alertText: new IonicSafeString("<p>Non-optimal site for wind turbine due to: </p><p><b>" + this.layerlookup[id] + "</b></p>")
                });
            return;
        }
  
        if (event.features[0].sourceLayer === 'windspeed') {
          var windspeed = parseFloat(event.features[0].properties['DN'] / 10);
          this.props.setGlobalState({'windspeed': windspeed});
          return;
        }
      }
  
      if (event.features.length > 0) {
        var properties = event.features[0].properties;

        // Don't respond to clicking on power lines or substations
        if (properties['power'] !== undefined) {
          if (['line', 'minor_line', 'cable', 'substation'].includes(properties['power'])) return;
        }

        var entityid = event.features[0].properties.id;
        this.setState({centreset: true});
        this.props.fetchEntity(entityid);
      }
    }
        
    onClickMarker = () => {
      const map = this.mapRef.current.getMap();
      var centre = [this.props.global.turbinelng, this.props.global.turbinelat];
      this.props.setGlobalState({centre: centre});
      this.setState({centreset: true});
      map.easeTo({center: centre, pitch: 85, zoom: 15.5, duration: 1000});
      return false;
    }

    onTurbineMarkerDragEnd = (event) => {
      if (this.state.flying) return;
      const lnglat = event.target.getLngLat();
      const submap = this.mapRef.current.getMap();
      const point = submap.project(lnglat);
      const features = submap.queryRenderedFeatures(point);
      if (features.length > 0) {
        const firstfeature = features[0];
        if (((firstfeature['source'] === 'allplanningconstraints') && (firstfeature['sourceLayer'] === 'all')) ||
            ((firstfeature['source'] === 'openmaptiles') && (firstfeature['sourceLayer'] === 'water'))) {

              if (firstfeature['sourceLayer'] === 'water') toast('Sorry, system not intended for offshore wind');
              else toast('Sorry, intended position has planning constraints');
            event.target.setLngLat({lat: this.props.global.turbinelat, lng: this.props.global.turbinelng});
            return;
        }
      }

      this.props.setGlobalState({turbinelat: lnglat.lat, turbinelng: lnglat.lng});      
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
          this.state.showconstraints, 
          this.props.global.planningconstraints,
          this.mapRef.current.getMap());
      });
    }
  
    render() {
        return (
          <>
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

          <IonModal className="wewantwind-modal" isOpen={this.state.showvote} onDidDismiss={() => this.setState({showvote: false})}>
            <IonHeader>
              <IonToolbar className="wob-toolbar">
                <IonTitle mode="ios">Cast your vote</IonTitle>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <IonList lines="none" style={{paddingTop: "20px"}}>
                <IonItem>
                  <IonText className="instruction-text">Enter your details below to cast your vote for the current wind turbine site. We will then email you a link to confirm your vote.</IonText>
                </IonItem>
                <IonItem>
                  <IonText className="instruction-text" style={{marginTop: "10px"}}><i>You can only cast one vote per email address.</i> However, you can reallocate your single vote to a different turbine site or withdraw your vote at any time.</IonText>
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
                  <span class="wrap">Allow other users to contact me via this site. Note: we will <b>never</b> publish or pass on your email address without your express permission.</span>
                  </IonCheckbox>
                </IonItem>

                {(this.state.recaptchaError !== '') ? (
                <IonItem color="danger">
                <IonText>{this.state.recaptchaError}</IonText>
                </IonItem>
                ) : null}
                <IonItem className={this.recaptcha ? 'ion-no-padding ion-invalid': 'ion-no-padding ion-valid'} 
                    style={{paddingTop: "20px"}}>
                    <ReCaptcha
                        style={{margin: "auto"}}
                        ref={(el) => {this.captchaRef = el;}}
                        size="normal"
                        render="explicit"
                        sitekey={process.env.REACT_APP_GOOGLE_RECAPTCHA_SITE_KEY}
                        name="recaptcha"
                        onloadCallback={this.onLoadRecaptcha}
                        verifyCallback={this.verifyCallback}
                        // expiredCallback={this.onExpiredCaptcha}
                    />
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

          <IonModal className="wewantwind-modal" isOpen={this.state.showmessage} onDidDismiss={() => this.setState({showmessage: false})}>
            <IonHeader>
              <IonToolbar className="wob-toolbar">
                <IonTitle mode="ios">Connect with nearby users</IonTitle>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <IonList lines="none" style={{paddingTop: "20px"}}>
                <IonItem>
                  <IonText className="instruction-text">There are <b>{ this.props.global.localpeople } user(s)</b> within {LOCAL_DISTANCE} miles of you who have agreed to be contacted. 
                  You can send an introductory message to them <b>containing your name and email address</b> to make contact. 
                  We will request your confirmation via email before messaging anyone.</IonText>
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
                  <IonText className="instruction-text" style={{fontSize: "75%", paddingTop: "10px", color: "#666"}}>
                    <b>Content of introductory email: </b> Dear [Recipient's name], The following user(s) are within {LOCAL_DISTANCE} miles of you and would like to connect with local WeWantWind users: 
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
                <IonItem className={this.recaptcha ? 'ion-no-padding ion-invalid': 'ion-no-padding ion-valid'} 
                    style={{paddingTop: "20px"}}>
                    <ReCaptcha
                        style={{margin: "auto"}}
                        ref={(el) => {this.captchaRef = el;}}
                        size="normal"
                        render="explicit"
                        sitekey={process.env.REACT_APP_GOOGLE_RECAPTCHA_SITE_KEY}
                        name="recaptcha"
                        onloadCallback={this.onLoadRecaptcha}
                        verifyCallback={this.verifyCallback}
                        // expiredCallback={this.onExpiredCaptcha}
                    />
                </IonItem>

                <IonItem>
                  <IonText style={{margin: "auto", paddingTop: "10px"}}>  
                    <IonButton onClick={() => {this.setState({showmessage: false})}} color="light" shape="round" size="medium" fill="solid">Cancel</IonButton>
                    <IonButton onClick={() => {this.sendMessage()}} color="success" shape="round" size="medium" fill="solid">Send intro message</IonButton>
                  </IonText>
                </IonItem>
              </IonList>
            </IonContent>
          </IonModal>

          <Toaster position="top-center" containerStyle={{top: 50}}/>

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
              <Map ref={this.mapRef}
                width="100vw"
                height="100vh"
                onLoad={this.onMapLoad} 
                onRender={this.onRender}
                onMoveEnd={this.onMapMoveEnd}
                onMouseEnter={this.onMouseEnter}
                onMouseMove={this.onMouseMove}
                onMouseLeave={this.onMouseLeave}   
                onClick={this.onClick}
                onDrag={this.onDrag}
                onIdle={this.onIdle}
                mapStyle={this.explorelayer}
                terrain={{source: "terrainSource", exaggeration: 1.1 }}
                minZoom={4}
                maxZoom={19}                
                maxBounds={DEFAULT_MAXBOUNDS}
                attributionControl={false}
                maxTileCacheSize={this.maxTileCacheSize}
                interactiveLayerIds={this.interactivelayers}
                initialViewState={{
                  longitude: DEFAULT_CENTRE[0],
                  latitude: DEFAULT_CENTRE[1],
                  pitch: 0,
                  zoom: 5.009253018856783,
                  maxPitch: 85
                }} >
                    <Tooltip id="ctrlpanel-tooltip" place="right" variant="light" style={{fontSize: "120%"}} />
                    <GeolocateControl onGeolocate={this.onGeolocate} position="top-left" />
                    {(this.props.global.turbinelat !== null) ? (
                      <>
                        {this.state.showmarker ? (
                        <Marker onClick={this.onClickMarker} onDragEnd={this.onTurbineMarkerDragEnd} longitude={this.props.global.turbinelng} latitude={this.props.global.turbinelat} draggable={true} anchor="bottom" >
                          <img alt="Wind turbine" width="40" src="./static/icons/windturbine_black.png" />
                        </Marker>                  
                        ) : null}

                        <Canvas ref={this.threeRef} latitude={this.props.global.turbinelat} longitude={this.props.global.turbinelng} altitude={this.state.altitude}>
                            <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]} />
                            <object3D scale={25} rotation={[0, 1, 0]}>
                                <WindTurbine container={this} />
                            </object3D>
                        </Canvas>
                      </>
                    ) : null}

                    <Popup longitude={0} latitude={0} ref={this.popupRef} closeButton={false} closeOnClick={false} />
              </Map>

            </div>
          </div>

          </div>
          </IonContent>

        </IonApp>
  
        {this.state.showconstraints ? (
          <div style={{position: "absolute", bottom: "0px", left: "0px", width: "100vw", zIndex: "9999"}}>
            <div style={{marginLeft: "0px", marginRight: "0px", backgroundColor: "#ffffffff"}}>
              <div>
                <IonGrid>
                  <IonRow class="ion-align-items-center ion-justify-content-center">
                    <IonCol size="12" className="planning-key-title-container">
                      <div className="horizontal-centred-container">
                        <IonText className="planning-key-title ">Non-optimal wind sites due to low wind / planning constraints</IonText>
                      </div>
                    </IonCol>
                  </IonRow>
                  <IonRow class="ion-align-items-center ion-justify-content-center">
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
              <div className="planning-key-footnote">Source data copyright of multiple organisations - <a href="/datasets" target="_new" style={{color: "black"}}>see full list of source datasets</a></div>
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
    
export const mapDispatchToProps = dispatch => {
  return {
      setGlobalState: (globalstate) => {
        return dispatch(global.setGlobalState(globalstate));
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
      fetchEntity: (id) => {
        return dispatch(global.fetchEntity({list: false, id: id}));
      },        
  }
}  

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Explore));