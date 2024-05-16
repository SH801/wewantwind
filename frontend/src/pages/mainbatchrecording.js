import React, { Component, useMemo } from 'react';
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
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import 'maplibre-gl/dist/maplibre-gl.css';
// import 'mapbox-gl/dist/mapbox-gl.css';
import { Map as MaplibreGL } from 'react-map-gl/maplibre';
import Map, { Popup, Marker, GeolocateControl } from 'react-map-gl';
import { Canvas, Coordinates } from "react-three-map";
import { useGLTF, useBoxProjectedEnv, CubeCamera, Environment, OrbitControls, BakeShadows } from '@react-three/drei'
import { v4 as uuidv4 } from 'uuid';
import maplibregl from '!maplibre-gl'; // eslint-disable-line import/no-webpack-loader-syntax

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
    TOTAL_SITES     
} from '../constants';
import { global } from "../actions";
import { initializeMap, mapRefreshPlanningConstraints } from "../functions/map";
import { setURLState } from "../functions/urlstate";
import Toolbar from '../components/toolbar';
import { initShaders, initVertexBuffers, renderImage } from './webgl';
import { Spacer } from '../components/spacer';
import { Site } from '../components/site';
import { Vote } from '../components/vote';
import { Download } from '../components/download';
import { Message } from '../components/message';
import { FlyToggle } from '../components/flytoggle';
import { RecordVideo } from '../components/recordvideo';
import { Share } from '../components/share';
import { Wind } from '../components/wind';
import { Constraints } from '../components/constraints';
import { Grid } from '../components/grid';

import { 
  TILESERVER_BASEURL
} from "../constants";

import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import MapLibreGL from 'maplibre-gl';

// mapboxgl.accessToken = 'sk.eyJ1Ijoic3BhY2VhcnQiLCJhIjoiY2x2dG53bzZvMTJrMjJqcXp3ZnlkOHlpYiJ9.G9c917GbNcF3IjULEXgDMg';

var allturbines = {};
var tiktok = true;

var turf = require('@turf/turf');

const videogenerationsteps = [
  {action: 'loadsite', delay: 5},
  {action: 'centre', delay: 1},
  {action: 'rotatestart', delay: 10},
  {action: 'recordstart', delay: 1},
  {action: 'fadeup', delay: 5},
  {action: 'hold', delay: 40},
  // {action: 'hold', delay: 5},
  {action: 'fadedown', delay: 5},
  {action: 'endscreen', delay: 2},
  {action: 'recordstop', delay: 1},
  {action: 'rotatestop', delay: 2}
]

// const videogenerationsteps = [
//   {action: 'orthogonalloadsite', delay: 5},
//   {action: 'getfeatures', delay: 3},
// ]

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
    turbinemesh.current.rotation.x = (1.5 * a);
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
        icons_white: [],
        iconsloaded_white: false,
        icons_grey: [],
        iconsloaded_grey: false,    
        altitude: null, 
        flying: false, 
        flyingcentre: null, 
        draggablesubmap: true,
        loosevote: null,
        showselectsite: false,
        showloosevote: false,
        showmarker: true,
        showsite: false,
        showvote: false,
        showturbine: false,
        showdownload: false,
        showmessage: false,
        showshare: false,
        showwind: false,
        showgrid: false,
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
        currentaltitudes: [],
        videogenerationtimer: null,
        videogenerationrunning: false,
        videogenerationitemindex: 0,
        videogenerationprocessindex: 0,
        videotransitionopacity: 0,
        videotransitioncache: [],
        videoendscreen: null,
        textimage: null,
        logo: null,
      };
      this.data = []; 
      this.helpIndex = 0;
      this.updatealtitude = false;
      this.ignoremovend = false;
      this.loadingurl = false;
      this.mapRef = React.createRef();
      this.maplibreRef = React.createRef();
      this.threeRef = React.createRef();
      this.submapRef = React.createRef();
      this.popupRef = React.createRef();
      this.elevations = require('../constants/allelevations.json');
      this.windturbines = require('../constants/windturbines.json');
      this.style_explore = require('../constants/style_explore_batchrecording.json');
      this.style_threedimensions = require('../constants/style_threedimensions.json');
      this.style_twodimensions = require('../constants/style_twodimensions.json');
      this.style_planningconstraints_defaults = require('../constants/style_planningconstraints_defaults.json');
      this.style_planningconstraints = this.constructPlanningConstraints(require('../constants/style_planningconstraints.json'));
      this.explorelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_planningconstraints, this.style_explore);
      this.satellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_planningconstraints, this.style_threedimensions);
      // this.explorelayer = 'mapbox://styles/mapbox/satellite-v9';
      // this.satellitelayer = 'mapbox://styles/mapbox/satellite-v9';

      var newelevations = {};
      var elevationskeys = Object.keys(this.elevations);
      for(var i = 0; i < elevationskeys.length; i++) {
        var currentkey = elevationskeys[i];
        var keysplit = currentkey.split(",");
        var lng = parseFloat(keysplit[0]).toFixed(4);
        var lat = parseFloat(keysplit[1]).toFixed(4);
        newelevations[lng + "," + lat] = this.elevations[currentkey];
      }
      this.elevations = newelevations;
      console.log(this.elevations);

      const logocanvas = document.createElement('canvas');
      if (tiktok) {
        logocanvas.height = (2 * 58) + 240 + 240;
        logocanvas.width = 2 * (540 - 17);  
      } else {
        logocanvas.height = 2 * 98;
        logocanvas.width = 2 * (1920 - 17);  
      }
      const logoctx = logocanvas.getContext('2d');

      var logopath = new Path2D('M9.07917722,0.0888888889 C4.06575949,0.0888888889 0,4.52222222 0,9.98888889 C0,15.4555556 4.06575949,19.8888889 9.07917722,19.8888889 C14.0925949,19.8888889 18.1583544,15.4555556 18.1583544,9.98888889 C18.1583544,4.52222222 14.0925949,0.0888888889 9.07917722,0.0888888889 Z M55.7284177,2.27777778 C55.6061392,2.27777778 55.5042405,2.38888889 55.5042405,2.52222222 L55.5042405,13.9888889 C55.5042405,14.1222222 55.6061392,14.2333333 55.7284177,14.2333333 L57.0938608,14.2333333 C57.2161392,14.2333333 57.318038,14.1222222 57.318038,13.9888889 L57.318038,13.2 C58.0211392,14 58.9891772,14.4555556 59.9979747,14.4555556 C62.1276582,14.4555556 63.8599367,12.4555556 63.8599367,9.97777778 C63.8599367,7.5 62.1276582,5.51111111 59.9979747,5.51111111 C58.9789873,5.51111111 58.0109494,5.96666667 57.318038,6.76666667 L57.318038,2.52222222 C57.318038,2.38888889 57.2161392,2.27777778 57.0938608,2.27777778 L55.7284177,2.27777778 Z M10.0166456,3.93333333 C11.1782911,3.96666667 12.3501266,4.46666667 13.2468354,5.45555556 C15.050443,7.42222222 15.1115823,10.5333333 13.3894937,12.4222222 C10.2815823,15.8111111 4.74848101,14.7222222 4.74848101,14.7222222 C4.74848101,14.7222222 3.74987342,8.68888889 6.85778481,5.3 C7.72392405,4.36666667 8.86518987,3.91111111 10.0166456,3.93333333 Z M26.3510127,5.51111111 C25.515443,5.51111111 24.7308228,5.95555556 24.231519,6.68888889 L24.231519,5.97777778 C24.231519,5.84444444 24.1296203,5.73333333 24.0073418,5.73333333 L22.6418987,5.73333333 C22.5196203,5.73333333 22.4177215,5.84444444 22.4177215,5.97777778 L22.4177215,14 C22.4177215,14.1333333 22.5196203,14.2444444 22.6418987,14.2444444 L24.0073418,14.2444444 C24.1296203,14.2444444 24.231519,14.1333333 24.231519,14 L24.231519,9.2 C24.2824684,8.12222222 24.9651899,7.27777778 25.8007595,7.27777778 C26.6668987,7.27777778 27.3903797,8.06666667 27.3903797,9.11111111 L27.3903797,14 C27.3903797,14.1333333 27.4922785,14.2444444 27.614557,14.2444444 L28.9901899,14.2444444 C29.1124684,14.2444444 29.2143671,14.1333333 29.2143671,14 L29.2041772,9.01111111 C29.3264557,8.03333333 29.9786076,7.27777778 30.7632278,7.27777778 C31.6293671,7.27777778 32.3528481,8.06666667 32.3528481,9.11111111 L32.3528481,14 C32.3528481,14.1333333 32.4547468,14.2444444 32.5770253,14.2444444 L33.9526582,14.2444444 C34.0749367,14.2444444 34.1768354,14.1333333 34.1768354,14 L34.1666456,8.48888889 C34.1972152,6.84444444 32.9132911,5.51111111 31.3236709,5.51111111 C30.3046835,5.52222222 29.3672152,6.16666667 28.9290506,7.17777778 C28.419557,6.14444444 27.4311392,5.5 26.3510127,5.51111111 L26.3510127,5.51111111 Z M39.3838608,5.51111111 C37.2541772,5.51111111 35.5218987,7.51111111 35.5218987,9.98888889 C35.5218987,12.4666667 37.2541772,14.4666667 39.3838608,14.4666667 C40.4028481,14.4666667 41.3708861,14.0111111 42.0637975,13.2111111 L42.0637975,14 C42.0637975,14.1333333 42.1656962,14.2444444 42.2879747,14.2444444 L43.6534177,14.2444444 C43.7756962,14.2444444 43.8775949,14.1333333 43.8775949,14 L43.8775949,5.97777778 C43.8877848,5.84444444 43.7858861,5.73333333 43.6534177,5.73333333 L42.2879747,5.73333333 C42.1656962,5.73333333 42.0637975,5.84444444 42.0637975,5.97777778 L42.0637975,6.76666667 C41.3606962,5.96666667 40.3926582,5.51111111 39.3838608,5.51111111 Z M50.1953165,5.51111111 C49.1763291,5.51111111 48.2082911,5.96666667 47.5153797,6.76666667 L47.5153797,5.97777778 C47.5153797,5.84444444 47.413481,5.73333333 47.2912025,5.73333333 L45.9257595,5.73333333 C45.803481,5.73333333 45.7015823,5.84444444 45.7015823,5.97777778 L45.7015823,17.4444444 C45.7015823,17.5777778 45.803481,17.6888889 45.9257595,17.6888889 L47.2912025,17.6888889 C47.413481,17.6888889 47.5153797,17.5777778 47.5153797,17.4444444 L47.5153797,13.2 C48.218481,14 49.186519,14.4555556 50.1953165,14.4555556 C52.325,14.4555556 54.0572785,12.4555556 54.0572785,9.97777778 C54.0572785,7.5 52.325,5.51111111 50.1953165,5.51111111 Z M69.0975316,5.51111111 C66.7844304,5.51111111 64.9196835,7.51111111 64.9196835,9.98888889 C64.9196835,12.4666667 66.7946203,14.4666667 69.0975316,14.4666667 C71.400443,14.4666667 73.2753797,12.4666667 73.2753797,9.98888889 C73.2753797,7.51111111 71.4106329,5.51111111 69.0975316,5.51111111 Z M73.7237342,5.73333333 C73.6116456,5.73333333 73.5199367,5.83333333 73.5199367,5.95555556 C73.5199367,6 73.5301266,6.04444444 73.5505063,6.07777778 L75.8941772,9.96666667 L73.5199367,13.9 C73.4587975,14 73.4791772,14.1444444 73.5810759,14.2111111 C73.6116456,14.2333333 73.6524051,14.2444444 73.6931646,14.2444444 L75.2725949,14.2444444 C75.3948734,14.2444444 75.506962,14.1777778 75.5681013,14.0666667 L76.9743038,11.5 L78.3805063,14.0666667 C78.4416456,14.1777778 78.5537342,14.2444444 78.6760127,14.2444444 L80.255443,14.2444444 C80.3675316,14.2444444 80.4592405,14.1444444 80.4592405,14.0222222 C80.4592405,13.9777778 80.4490506,13.9444444 80.4286709,13.9 L78.0544304,9.96666667 L80.3981013,6.07777778 C80.4592405,5.97777778 80.4388608,5.83333333 80.336962,5.76666667 C80.3063924,5.74444444 80.2656329,5.73333333 80.2248734,5.73333333 L78.645443,5.73333333 C78.5231646,5.73333333 78.4110759,5.8 78.3499367,5.91111111 L76.9743038,8.43333333 L75.5986709,5.91111111 C75.5375316,5.8 75.425443,5.73333333 75.3031646,5.73333333 L73.7237342,5.73333333 Z M10.1185443,5.88888889 L9.23202532,7.88888889 L7.40803797,8.85555556 L9.23202532,9.82222222 L10.1185443,11.8222222 L11.0152532,9.82222222 L12.8392405,8.85555556 L11.0152532,7.88888889 L10.1185443,5.88888889 Z M39.6997468,7.3 C40.9938608,7.3 42.0434177,8.48888889 42.0637975,9.95555556 L42.0637975,10.0222222 C42.0536076,11.4888889 40.9938608,12.6777778 39.6997468,12.6777778 C38.395443,12.6777778 37.3356962,11.4777778 37.3356962,9.98888889 C37.3356962,8.5 38.395443,7.3 39.6997468,7.3 L39.6997468,7.3 Z M49.8692405,7.3 C51.1735443,7.3 52.2332911,8.5 52.2332911,9.98888889 C52.2332911,11.4777778 51.1735443,12.6777778 49.8692405,12.6777778 C48.5751266,12.6777778 47.5255696,11.4888889 47.5051899,10.0222222 L47.5051899,9.95555556 C47.5255696,8.48888889 48.5751266,7.3 49.8692405,7.3 L49.8692405,7.3 Z M59.6820886,7.3 C60.9863924,7.3 62.0461392,8.5 62.0461392,9.98888889 C62.0461392,11.4777778 60.9863924,12.6777778 59.6820886,12.6777778 C58.3879747,12.6777778 57.3384177,11.4888889 57.318038,10.0222222 L57.318038,9.95555556 C57.3384177,8.48888889 58.3879747,7.3 59.6820886,7.3 L59.6820886,7.3 Z M69.0771519,7.3 C70.3814557,7.3 71.4412025,8.5 71.4412025,9.98888889 C71.4412025,11.4777778 70.3814557,12.6777778 69.0771519,12.6777778 C67.7728481,12.6777778 66.7131013,11.4777778 66.7131013,9.98888889 C66.7131013,8.5 67.7728481,7.3 69.0771519,7.3 Z');
      logoctx.scale(1.5, 1.5);
      logoctx.fillStyle = "#ffffff";
      logoctx.strokeStyle = "#ffffff";
      // logoctx.stroke(logopath);
      logoctx.fill(logopath);
      logoctx.fillStyle = "#ffffff";
      logoctx.strokeStyle = "#ffffff";

      const logoUrl = logocanvas.toDataURL();
      var img = new Image();
      img.src = logoUrl;
      this.state.logo = img;

      this.nonsatellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_planningconstraints, this.style_twodimensions);
      this.fadestepscount = 256;
      this.fadestepsincrement = parseFloat(100 / 256);
      this.fademinimumtime = 200;
            
      let path = window.location.pathname;
      if (path === '/toggletesting/') {
        console.log("Enabling testing mode...")
        this.props.setGlobalState({testingenabled: !this.props.global.testingenabled});
        this.props.history.push("/");
      }
  
      const buttons = {
        'site':           new Site({mapcontainer: this}),
        'vote':           new Vote({mapcontainer: this}),
        'download':       new Download({mapcontainer: this}),
        'message':        new Message({mapcontainer: this}),
        'share':          new Share({mapcontainer: this}),
        'fly':            new FlyToggle({mapcontainer: this}),
        'video':          new RecordVideo({mapcontainer: this}),
        'wind':           new Wind({mapcontainer: this}),
        'planning':       new Constraints({mapcontainer: this}),
        'grid':           new Grid({mapcontainer: this})
      }

      this.props.setGlobalState({'buttons': buttons});

      this.hoveredPolygonId = null;

      // **************************************************************
      // Comment out the following when not doing batch video recording
      // **************************************************************

      this.soundtrack = new Audio('./static/audio/soundtrack.mp3');              

      if (this.state.videotransitioncache.length === 0) {
        this.endscreen = new Image();
        if (tiktok) {
          this.endscreen.src = "/static/icons/wewantwind_endscreen_tiktok.png";
        } else {
          this.endscreen.src = "/static/icons/wewantwind_endscreen.png";
        }
        // console.log("Creating transition cache");
        // var videotransitioncache = [];
        // for(var i = 0; i < 256; i++) {
        //   var hex = Number(i).toString(16);        
        //   while (hex.length < 2) {
        //     hex = "0" + hex;
        //   }
        //   const transitioncanvas = document.createElement('canvas');
        //   var height = 2 * 1080;
        //   var width = 2 * 1920;  
        //   if (tiktok) {
        //     height = 1920;
        //     width = 1080;  
        //   }
        //   transitioncanvas.height = height;
        //   transitioncanvas.width = width;
        //   const ctx = transitioncanvas.getContext('2d');
        //   ctx.beginPath(); 
        //   ctx.fillStyle = "#000000" + hex;
        //   ctx.rect(0, 0, width, height); 
        //   ctx.fill();
        //   const dataUrl = transitioncanvas.toDataURL();
        //   var img = new Image();
        //   img.src = dataUrl;
        //   videotransitioncache.push(img);              
        // }
        // this.state.videotransitioncache = videotransitioncache;
        // console.log("Finished creating transition cache");  
      }
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
      let urlparams = queryString.parse(this.props.location.search);
      if ((urlparams.vlat !== undefined) && (urlparams.vlng !== undefined)) {
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
        // this.updateAltitude();
        // this.updateCurrentWindTurbines(this.mapRef.current.getMap());
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
      const latPosPointInPixels = map.transform.centerPoint.add(new mapboxgl.Point(0, latOffset));
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
      altitude += map.queryTerrainElevation({lat: lat, lng: lng}) || 0;
      const pitch_ = pitch * Math.PI / 180;
      const cameraToCenterDistance = 0.5 / Math.tan(map.transform._fov / 2) * map.transform.height;
      const pixelAltitude = Math.abs(Math.cos(pitch_) * cameraToCenterDistance);
      const metersInWorldAtLat = (2 * Math.PI * 6378137 * Math.abs(Math.cos(lat * (Math.PI / 180))));
      const worldsize = (pixelAltitude / altitude) * metersInWorldAtLat;
      const zoom = Math.log(worldsize / map.transform.tileSize) / Math.LN2;
      const latOffset = Math.tan(pitch_) * cameraToCenterDistance;
      const newPixelPoint = new mapboxgl.Point(map.transform.width / 2, map.transform.height / 2 + latOffset);
      const newLongLat = new mapboxgl.LngLat(lng, lat);
      // console.log(cameraToCenterDistance, pixelAltitude, metersInWorldAtLat, worldsize, latOffset, newPixelPoint, newLongLat, lng, lat, zoom, pitch, bearing);
      if (!isNaN(zoom)) map.transform.zoom = zoom;
      map.transform.pitch = pitch;
      map.transform.bearing = bearing;
      map.transform.setLocationAtPoint(newLongLat, newPixelPoint);
      map.setBearing(map.getBearing());
      mutex = false;
    }

    onMapLoad = (event) => {
        
        this.helpStart();
        this.loadingurl = false;

        var map = this.mapRef.current.getMap();
        let scale = new mapboxgl.ScaleControl({
          maxWidth: 2000,
          unit: 'metric',
          style: 'map-scale'
        });

        // map.setFog({
        //   'range': [0, 5],
        //   'horizon-blend': 0.5,
        //   'color': '#fffff6',
        //   'high-color': '#fffff6',
        //   'space-color': '#6699ff',
        //   'star-intensity': 0.0
        // });

      //   map.setFog({
      //     'range': [-0.5, 2],
      //     'color': '#def',
      //     'high-color': '#def',
      //     'space-color': '#def'
      // });

        // // Add a directional light
        // map.setLights([{
        //   "id": "sun_light",
        //   "type": "directional",
        //   // "position": [1.5, 180 + sunPos.azimuth * 180 / Math.PI, 90 - sunPos.altitude * 180 / Math.PI],
        //   "properties": {
        //       "color": "rgba(255.0, 0.0, 0.0, 1.0)",
        //       "intensity": 1,
        //       "direction": [200.0, 40.0],
        //       "cast-shadows": true,
        //       "shadow-intensity": 0.2
        //   }
        // }]);

      //   var SunCalc = require('suncalc');
      //   var date = new Date();
      //   var sunPos = SunCalc.getPosition(date, 51, 0);

      //   console.log(sunPos);
      //   sunPos.altitude = 1;

      //   map.setLight({
      //     anchor: 'map',
      //     position: [1.5, 180 + sunPos.azimuth * 180 / Math.PI, 90 - sunPos.altitude * 180 / Math.PI],
      //     'position-transition': {duration: 0}
      // }, {duration: 0});

        // map.addSource('mapbox-dem', {
        //   type: 'raster-dem',
        //   url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        //   tileSize: 512,
        //   maxzoom: 20
        // });
        // map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1 });
      

        // map.setFog({});
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

        map.addControl(new mapboxgl.AttributionControl(), 'bottom-left');
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
      var newbuttonsstate = JSON.parse(JSON.stringify(this.props.global.buttonsstate));
      if (this.props.global.buttonsstate[buttonname] !== state) {
        newbuttonsstate[buttonname] = state;
        if (state) map.addControl(this.props.global.buttons[buttonname], 'top-left'); 
        else map.removeControl(this.props.global.buttons[buttonname]);
        this.props.setGlobalState({buttonsstate: newbuttonsstate});
      }      
    }

    onClick = (event) => {

        // User clicks so remove centre
        if (event.clickOnLayer) this.setState({centreset: false});  

        if (this.props.global.page !== PAGE.EXPLORE) return;

        const map = this.mapRef.current.getMap();

        if (this.state.showsite) {
          const lnglat = event.lngLat;
          if (lnglat.lng < -180) lnglat.lng += 360;
          this.props.setGlobalState({turbinelat: lnglat.lat, turbinelng: lnglat.lng});
          this.setButton(map, 'share', true);
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
  
          // Don't respond to clicking on power lines or substations
          if (properties['power'] !== undefined) {
            if (['line', 'minor_line', 'cable', 'substation'].includes(properties['power'])) return;
          }
  
          var entityid = event.features[0].properties.id;
          this.setState({centreset: true});
          this.props.fetchEntity(entityid);
        } else {
          if (this.state.showselectsite) {
            // Check whether point is in sea
            const lnglat = event.lngLat;
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
            if ((this.props.global.page === PAGE.NEARESTTURBINE) || (this.props.global.page === PAGE.SHOWTURBINE)) {
                var map = this.mapRef.current.getMap();
                this.reorientToTurbine(map);    
            }
        });          
    }
  
    onSubmapLoad = (event) => {
      var submap = this.submapRef.current.getMap();
      submap.dragRotate.disable();
      submap.touchZoomRotate.disableRotation();
      let scale = new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'imperial',
        style: 'map-scale'
      });
      submap.addControl(scale, 'top-right');
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

        // gl.drawArrays(gl.TRIANGLES, 0, n);

        if (this.state.textimage) {
          renderImage(gl, this.state.textimage);
        }

        if (this.state.logo) {
          renderImage(gl, this.state.logo);
        }

        if (this.state.videoendscreen) {
          renderImage(gl, this.state.videoendscreen);          
        }

        if ((this.state.videotransitioncache.length === 256) && (this.state.videotransitionopacity !== 0)) {
          renderImage(gl, this.state.videotransitioncache[parseInt(255 * this.state.videotransitionopacity / 100)]);
        }
    }
    
    onIdle = () => {
      if (this.updatealtitude) {
        this.updatealtitude = false;
        this.updateAltitude();
      }

      // this.updateCurrentWindTurbines(this.mapRef.current.getMap());

      if (this.state.flying) {
        console.log("onIdle, triggering flyaround");
        this.flyingRun();
      }
    }

    onMapMoveEnd = (event) => {

        if (this.props.global.pagetransitioning) return;

        if (this.state.flying) return;

        switch (this.props.global.page) {
            case PAGE.NEARESTTURBINE_OVERVIEW:
                this.setState({showmarker: true});
                break;
            case PAGE.EXPLORE:

                this.updatealtitude = true;
                if (this.state.videogenerationrunning) {
                  var map = this.mapRef.current.getMap();
                  var zoom = map.getZoom();
                  if (zoom < THREED_ZOOM) map.setZoom(THREED_ZOOM);
                  this.setState({showmarker: false});
                  this.updateCurrentWindTurbines(map);
                } else {
                  if (this.mapRef.current !== null) {
                    var map = this.mapRef.current.getMap();
                    var zoom = map.getZoom();
                    var pitch = map.getPitch();
                    var bearing = map.getBearing();
                    if (zoom < THREED_ZOOM) {
                        this.setState({showmarker: true});
                        // if ((pitch !== 0) || (bearing !== 0)) map.jumpTo({pitch: 0, bearing: 0, duration: 0})
                        if (pitch === 85) map.jumpTo({pitch: 0, duration: 0});
                      } else {
                        this.setState({showmarker: false});
                        if (pitch < 80) map.easeTo({pitch: 85, duration: 1000});
                    }

                    this.updateCurrentWindTurbines(map);
                  }
                }

                break;
            case PAGE.NEARESTTURBINE:
            case PAGE.SHOWTURBINE:
                this.updatealtitude = true;

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

    updateAltitude = () => {
      if (this.maplibreRef.current !== null) {
        const map = this.maplibreRef.current.getMap();
        var altitude = map.queryTerrainElevation({lat: this.props.global.turbinelat, lng: this.props.global.turbinelng}, { exaggerated: true }) || 0;
        // console.log("Altitude", altitude);
        // if (altitude < 0) altitude = 0;
        this.setState({altitude: altitude});
      }
    }

    updateCurrentWindTurbines = (map) => {
      const windturbines = map.queryRenderedFeatures(
        {layers: ['renewables_windturbine']}
      );
      var currentwindturbines = [];
      for(var i = 0; i < windturbines.length; i++) {
        currentwindturbines.push(windturbines[i].geometry.coordinates);
      }
      console.log("Current turbines count", windturbines.length, currentwindturbines);
      this.updateCurrentAltitudes(currentwindturbines);
      this.setState({currentwindturbines: currentwindturbines});
    }

    updateCurrentAltitudes = (currentwindturbines) => {
      // const viewablemap = this.mapRef.current.getMap();
      if (this.mapRef.current !== null) {
        const map = this.mapRef.current.getMap();
        var currentaltitudes = [];
        for(var i = 0; i < currentwindturbines.length; i++) {
          // map.jumpTo({center: viewablemap.getCenter(), zoom: viewablemap.getZoom(), bearing: viewablemap.getBearing(), pitch: viewablemap.getPitch(), animate: false});
          var altitude = map.queryTerrainElevation({lng: currentwindturbines[i][0], lat: currentwindturbines[i][1]}, { exaggerated: false });
          // var altitude = map.queryTerrainElevation([currentwindturbines[i][0], currentwindturbines[i][1]]);
          // var altitude = map.queryTerrainElevation(map.getCenter());
          altitude = 267.9;
          // altitude = 0;
          // console.log("Altitude for index", i, currentwindturbines[i], altitude);
          currentaltitudes.push(altitude);
        }
        this.setState({currentaltitudes: currentaltitudes});
      }
    }

    updateHelp = () => {
      if ((this.props.global.page !== PAGE.NEARESTTURBINE) && (this.props.global.page !== PAGE.SHOWTURBINE)) return;

      // console.log("updateHelp", this.helpIndex);
      const links = ['intro', 'vote', 'download', 'message', 'share', 'fly', 'record'];

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
        this.setState({'showtooltipsite': false, 'showtooltipvote': false, 'showtooltipdownload': false, 'showtooltipmessage': false, 'showtooltipshare': false, 'showtooltipfly': false, 'showtooltiprecord': false});
        this.props.setGlobalState({helpInterval: null});
        this.helpIndex = 0;
      }
    }

    flyingStart = () => {
      if (!this.state.flying) {
        this.setState({flying: true, draggablesubmap: false, preflightposition: {lat: this.props.global.currentlat, lng: this.props.global.currentlng }}, () => {          

          this.submapInterval = setInterval(this.updateSubmapPosition, 200);

          if ((this.props.global.page === PAGE.NEARESTTURBINE) || (this.props.global.page === PAGE.SHOWTURBINE)) {
            // Start camera from specific position high up and certain bearing from wind turbine
            var turbinepos = point([this.props.global.turbinelng, this.props.global.turbinelat]);
            var viewingdistance = 0.6;
            var viewingbearing = -180;
            var options = {units: 'kilometres'};
            var viewingpos = destination(turbinepos, viewingdistance, viewingbearing, options);
            var map = this.mapRef.current.getMap();
            this.setCameraPosition({lng: viewingpos['geometry']['coordinates'][0], lat: viewingpos['geometry']['coordinates'][1], altitude: 600, pitch: 45, bearing: 180 + viewingbearing});
            // this.updateAltitude();
            // this.flyingRun();
          }

          if (this.props.global.page === PAGE.EXPLORE) {
            var map = this.mapRef.current.getMap();
            var mapcentre = map.getCenter();
            var centre = [mapcentre.lng, mapcentre.lat];
            var zoom = map.getZoom();
            if (this.state.centreset) {
              console.log("Centre is set already, using that for flying");
              centre = this.props.global.centre;
              zoom = this.props.global.zoom;
            } 
            this.props.setGlobalState({centre: centre, zoom: zoom}).then(() => {  
              console.log(centre);
              var turbinepos = point(centre);
              var viewingdistance = 2;
              var viewingbearing = -180;
              var options = {units: 'kilometres'};
              var viewingpos = destination(turbinepos, viewingdistance, viewingbearing, options);
              var map = this.mapRef.current.getMap();
              this.setCameraPosition({lng: viewingpos['geometry']['coordinates'][0], lat: viewingpos['geometry']['coordinates'][1], altitude: (400 * viewingdistance / 0.6), pitch: 60, bearing: 180 + viewingbearing});
              // this.updateAltitude();
              // this.flyingRun();
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
            map.jumpTo({center: centre, animate: false});
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
      anchor.download = "wewantwind.org - " + readableposition;
  
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
          const docurl = DOMAIN_BASEURL + '/sitereport?type=' + type + '&lat=' + String(lat) + '&lng=' + String(lng);
          this.setState({generatingfile: true, progress: 0});
          var timer = setInterval(() => {
            var currentstep = this.state.progress;
            if (currentstep < 100) {
              currentstep += 5;
              this.setState({progress: currentstep});  
            }
          }, 1800);
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
      this.props.setGlobalState({windturbine: this.state.windturbine, turbinetowerheight: this.state.hubheight, turbinebladeradius: (this.state.turbineparameters['Rotor diameter'] / 2)});
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

    stepVideoGenerationProcess = () => {
      if (!this.state.videogenerationrunning) return;

      console.log(this.props.global.allwindturbines);
      var step = this.state.videogenerationprocessindex;
      var itemindex = this.state.videogenerationitemindex;
      if (step === videogenerationsteps.length) {
        step = 0;
        itemindex++;
        // if (itemindex === 2) {
        if (this.props.global.allwindturbines.length === itemindex) {
          console.log("Reached end of video generation loop - quitting");
          const element = document.createElement("a");
          element.href =  URL.createObjectURL(new Blob([JSON.stringify(allturbines, null, 2)], {type: "application/json"}));
          element.download = "allwindturbines.json";
          element.click();
          return;
        }
      }

      var currentstep = videogenerationsteps[step];
      var currentwindfarm = this.props.global.allwindturbines[itemindex];
      console.log("Itemindex", itemindex, "Step", step, 'Action', currentstep['action'])
      if ((this.mapRef === null) || (this.mapRef.current === null)) {
        this.setState({videogenerationtimer: videogenerationtimer, videogenerationitemindex: itemindex, videogenerationprocessindex: step});
        var videogenerationtimer = setTimeout(this.stepVideoGenerationProcess, 1000);
        return;
      }

      const map = this.mapRef.current.getMap();
      const canvas = map.getCanvas();
      const fadedelayincrement = 1000 * currentstep['delay'] / this.fadestepscount;

      switch(currentstep['action']) {
        case 'endscreen':
          this.setState({videotransitionopacity: 100, videoendscreen: this.endscreen});
          setTimeout(() => {this.transitionFadeUp(fadedelayincrement)}, fadedelayincrement);  
          break;
        case 'hold':
          break;
        case 'orthogonalloadsite':
          map.fitBounds(currentwindfarm.bbox, {duration: 1000, padding: {top: 40, bottom: 40, left: 40, right: 40}});   
          break;
        case 'getfeatures':
          const windturbines = map.queryRenderedFeatures(
            {layers: ['renewables_windturbine']}
          );
          for(var i = 0; i < windturbines.length; i++) {
            var coordinates = windturbines[i].geometry.coordinates;
            var key = coordinates[0].toString() + "," + coordinates[1].toString();
            allturbines[key] = coordinates; 
          }
    
          break;
        case 'loadsite':
          if (tiktok) {
            const textcanvas = document.createElement('canvas');
            textcanvas.height = 720;
            textcanvas.width = canvas.width;
            const ctx = textcanvas.getContext('2d');
            ctx.font = '50px Open Sans, light';
            ctx.beginPath(); // Start a new path
            ctx.fillStyle = "#00000099";
            ctx.rect(0, 0, canvas.width, canvas.height); 
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "#ffffff";
            var title = currentwindfarm.name;
            ctx.fillText(title, 35, 65);
            var subtitle = '';
            if (currentwindfarm.extraproperties['number:of:elements'] !== undefined) {
              subtitle += currentwindfarm.extraproperties['number:of:elements'] + " turbine";
              if (currentwindfarm.extraproperties['number:of:elements'] !== 1) subtitle += "s";
            }
            if (currentwindfarm.extraproperties['plant:output:electricity'] !== undefined) {
              if (subtitle !== '') subtitle += ", ";
              subtitle += parseFloat(currentwindfarm.extraproperties['plant:output:electricity']).toFixed(1) + ' MW';

            }
            if (subtitle !== '') subtitle += ", ";
            subtitle += currentwindfarm.centre[1].toFixed(5) + "°N, " + currentwindfarm.centre[0].toFixed(5) + "°E";
            ctx.beginPath(); 
            ctx.font = '35px Open Sans, light';
            ctx.fillText(subtitle, 35, 110);
            ctx.font = '20px Open Sans';
            ctx.fillStyle = "#ffffff";
            ctx.fillText("Terrain data and satellite imagery © Mapbox https://www.mapbox.com/about/maps/", 165, 145);
            ctx.fillText("Renewables data and © OpenMapTiles from © OpenStreetMap contributors", 35, 180);
            ctx.fillText("Created by WeWantWind.org", 35, 210);

            const dataUrl = textcanvas.toDataURL();
            var img = new Image();
            img.src = dataUrl;
            this.setState({videoendscreen: null, videotransitionopacity: 100, textimage: img});
            var currentwindfarmpos = point([currentwindfarm.centre[0], currentwindfarm.centre[1]]);
            var viewingdistance = 0.6;
            var viewingbearing = -180;
            var options = {units: 'kilometres'};
            var viewingpos = destination(currentwindfarmpos, viewingdistance, viewingbearing, options);
            map.fitBounds(currentwindfarm.bbox, {duration: 1000, padding: {top: 0, bottom: 0, left: 0, right: 0}});   
          } else {
            const textcanvas = document.createElement('canvas');
            textcanvas.height = 300;
            textcanvas.width = canvas.width;
            const ctx = textcanvas.getContext('2d');
            ctx.font = '50px Open Sans, light';
            ctx.beginPath(); // Start a new path
            ctx.fillStyle = "#00000099";
            ctx.rect(0, 0, canvas.width, canvas.height); 
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "#ffffff";
            var title = currentwindfarm.name;
            if (currentwindfarm.extraproperties['number:of:elements'] !== undefined) {
              title += ", " + currentwindfarm.extraproperties['number:of:elements'] + " turbine";
              if (currentwindfarm.extraproperties['number:of:elements'] !== 1) title += "s";
            }
            if (currentwindfarm.extraproperties['plant:output:electricity'] !== undefined) title += ", " + parseFloat(currentwindfarm.extraproperties['plant:output:electricity']).toFixed(1) + ' MW';
            title += ', ' + currentwindfarm.centre[1].toFixed(5) + "°N, " + currentwindfarm.centre[0].toFixed(5) + "°E";
            ctx.fillText(title, 35, 85);
            ctx.beginPath(); 
            ctx.font = '25px Open Sans';
            ctx.fillStyle = "#ffffff";
            ctx.fillText("Terrain data and satellite imagery © Mapbox https://www.mapbox.com/about/maps/ Renewables data and © OpenMapTiles from © OpenStreetMap contributors. Created by WeWantWind.org", 165, 125);
            const dataUrl = textcanvas.toDataURL();
            var img = new Image();
            img.src = dataUrl;
            this.setState({videoendscreen: null, videotransitionopacity: 100, textimage: img});
            var currentwindfarmpos = point([currentwindfarm.centre[0], currentwindfarm.centre[1]]);
            var viewingdistance = 0.6;
            var viewingbearing = -180;
            var options = {units: 'kilometres'};
            var viewingpos = destination(currentwindfarmpos, viewingdistance, viewingbearing, options);
            // this.setCameraPosition({lng: viewingpos['geometry']['coordinates'][0], lat: viewingpos['geometry']['coordinates'][1], altitude: 600, pitch: 60, bearing: 180 + viewingbearing});
            // map.jumpTo({center: map.getCenter(), pitch: 60, animation: true, duration: 1000});
            map.fitBounds(currentwindfarm.bbox, {duration: 1000, padding: {top: 40, bottom: 40, left: 40, right: 40}});               
          }
          break;
        case 'centre':
          map.jumpTo({center: {lat: currentwindfarm.centre[1], lng: currentwindfarm.centre[0]}, pitch: 80, animate: true, duration: 500});
          break;
        case 'fadeup':
          setTimeout(() => {this.transitionFadeUp(fadedelayincrement)}, fadedelayincrement);  
          break;
        case 'fadedown':
          setTimeout(() => {this.transitionFadeDown(fadedelayincrement)}, fadedelayincrement);  
          break;
        case 'rotatestart':
          this.setState({flying: true});
          this.setState({flying: true, draggablesubmap: false, preflightposition: {lat: this.props.global.currentlat, lng: this.props.global.currentlng }}, () => {          
            this.submapInterval = setInterval(this.updateSubmapPosition, 200);
            this.flyingRun();  
          });
          break;
        case 'rotatestop':
          this.flyingStop();
          break;
        case 'zoom':
          map.flyTo({animate: true, duration: 1000 * currentstep['delay'], zoom: map.getZoom() + currentstep['value']});
          break;
        case 'recordstart':
          // Use MediaRecorder to record video as it's most efficient
          // Tried using MP4 conversion but too CPU intensive when main app is already working hard
          // this.data = []; 
          const data = []; 
          this.soundtrack.play().then( () => {
            const audioStream = this.soundtrack.captureStream();
            const videoStream = canvas.captureStream(25); 
            videoStream.addTrack(audioStream.getAudioTracks()[0]);          
            // const mediaRecorder = new MediaRecorder(videoStream, {videoBitsPerSecond: 1000000000});
            var mediaRecorder = new MediaRecorder(videoStream, {videoBitsPerSecond: 100000000});        
            if (tiktok) {
              mediaRecorder = new MediaRecorder(videoStream, {videoBitsPerSecond: 20000000});        
            }
            this.setState({mediarecorder: mediaRecorder});
            mediaRecorder.ondataavailable = (e) => data.push(e.data);
            mediaRecorder.onstop = (e) => {
              const anchor = document.createElement("a");
              anchor.href =  URL.createObjectURL(new Blob(data, {type: "video/webm;codecs=h264"}));
              const now = new Date();
              const timesuffix = now.toISOString().substring(0,19).replaceAll('T', ' ').replaceAll(':', '-');
              anchor.download = currentwindfarm.name + ' - ' + currentwindfarm.centre[1].toFixed(5) + "°N, " + currentwindfarm.centre[0].toFixed(5) + "°E.webm";
              anchor.click();  
            }  
            mediaRecorder.start();  
          });
          break;
        case 'recordstop':
          if (this.state.mediarecorder) {
            this.soundtrack.pause();
            this.soundtrack.currentTime = 0;
            this.state.mediarecorder.stop(); 
            this.setState({mediarecorder: null});
          }
          break;
      }

      step++;
      // clearTimeout(this.state.videogenerationtimer);
      if (this.state.videogenerationrunning) {
        var videogenerationtimer = setTimeout(this.stepVideoGenerationProcess, 1000 * currentstep['delay']);
        this.setState({videogenerationtimer: videogenerationtimer, videogenerationitemindex: itemindex, videogenerationprocessindex: step});  
      }
    }

    transitionFadeUp = (fadedelayincrement) => {
      // console.log("transitionFadeUp");
      if (!this.state.videogenerationrunning) return;
      var currentfade = this.state.videotransitionopacity;
      var fadedelay = fadedelayincrement;
      while (fadedelay < this.fademinimumtime) {
        fadedelay += fadedelayincrement;
        currentfade -= this.fadestepsincrement;
      }
      if (currentfade > 0) {
        this.setState({videotransitionopacity: currentfade});
        setTimeout(() => {this.transitionFadeUp(fadedelayincrement)}, fadedelayincrement);
      } else {
        this.setState({videotransitionopacity: 0});
      }
    }

    transitionFadeDown = (fadedelayincrement) => {
      // console.log("transitionFadeDown");
      if (!this.state.videogenerationrunning) return;
      var currentfade = this.state.videotransitionopacity;
      var fadedelay = fadedelayincrement;
      while (fadedelay < this.fademinimumtime) {
        fadedelay += fadedelayincrement;
        currentfade += this.fadestepsincrement;
      }
      if (currentfade < 100) {
        this.setState({videotransitionopacity: currentfade});
        setTimeout(() => {this.transitionFadeDown(fadedelayincrement)}, fadedelayincrement);
      } else {
        this.setState({videotransitionopacity: 100});
      }
    }

    combineBoundingBox = (bbox1, bbox2) => {
      var retbbox = bbox1;

      if (bbox2[0][0] < retbbox[0][0]) retbbox[0][0] = bbox2[0][0];
      if (bbox2[0][1] < retbbox[0][1]) retbbox[0][1] = bbox2[0][1];
      if (bbox2[1][0] > retbbox[1][0]) retbbox[1][0] = bbox2[1][0];
      if (bbox2[1][1] > retbbox[1][1]) retbbox[1][1] = bbox2[1][1];

      return retbbox;
    }

    combineSites = (site1, site2) => {
      var name = site1['name'];
      var number_of_elements = site1['extraproperties']['number:of:elements'] + site2['extraproperties']['number:of:elements'];
      var plant_output_electricity = parseFloat(site1['extraproperties']['plant:output:electricity']) + parseFloat(site2['extraproperties']['plant:output:electricity']) + ' MW';
      var bbox = this.combineBoundingBox(site1.bbox, site2.bbox);
      var centre = [(bbox[0][0] + bbox[1][0]) / 2, (bbox[0][1] + bbox[1][1]) / 2];
      return {name: name, centre: centre, bbox: bbox, extraproperties: {'number:of:elements': number_of_elements, 'plant:output:electricity': plant_output_electricity}};
    }

    runVideoGeneration = () => {
      if (!this.state.videogenerationrunning) {
        this.setPage(PAGE.EXPLORE);
        this.props.loadAllWindTurbines().then(() => {
          var consolidatedwindturbines = [];
          var consolidatedlist = {};
          var consolidatelist = ['Aikengall', 'Altahullion', 'Mynydd Portref', 'Parc Cynog', 'Glass Moor', 'Ardrossan', 'Blantyre Muir', 'Withernwick', 'Lochluichart', 'Beinn Tharsuinn', 'Gordonbush', 'Tullo', "St John's Well", 'Slieve Divena', 'Winscales', 'Beinn an Tuirc', 'Lochelbank', 'Goole Fields'];

          for (var i = 0; i < this.props.global.allwindturbines.length; i++) {
            var consolidate = false;
            var currentwindturbine = this.props.global.allwindturbines[i];
            for(var j = 0; j < consolidatelist.length; j++) {
                if (consolidatelist[j] === currentwindturbine['name'].substr(0, consolidatelist[j].length)) {
                  consolidate = true;
                  if (consolidatedlist[consolidatelist[j]] === undefined) {
                    currentwindturbine['name'] = consolidatelist[j] + ' Wind Farm';
                    consolidatedlist[consolidatelist[j]] = [];
                  }
                  consolidatedlist[consolidatelist[j]].push(currentwindturbine);
                  break;
                }
            }

            if (!consolidate) consolidatedwindturbines.push(currentwindturbine);
          }

          var consolidatedkeys = Object.keys(consolidatedlist);
          for(var i = 0; i < consolidatedkeys.length; i++) {
            var consolidateditems = consolidatedlist[consolidatedkeys[i]];
            if (consolidateditems.length === 1) consolidatedwindturbines.push(consolidateditems[0]);
            else {
              var cumulativeconsolidated = consolidateditems[0];
              for(var j = 1; j < consolidateditems.length; j++) {
                cumulativeconsolidated = this.combineSites(cumulativeconsolidated, consolidateditems[j]);
              }              
              consolidatedwindturbines.push(cumulativeconsolidated);
            }
          }

          this.props.setGlobalState({allwindturbines: consolidatedwindturbines}).then(() => {
            var videogenerationtimer = setTimeout(this.stepVideoGenerationProcess, 1000);
            this.setState({allwindturbines: consolidatedwindturbines, videogenerationrunning: true, videogenerationtimer: videogenerationtimer, videogenerationitemindex: 0, videogenerationprocessindex: 0});  
          })
        })  
      } else {
        console.log("Stopping video generation");
        this.soundtrack.pause();
        this.soundtrack.currentTime = 0;
        clearTimeout(this.state.videogenerationtimer);
        if (this.state.flying) this.flyingStop();
        this.setState({videotransitionopacity: 0, videoendscreen: null, videogenerationrunning: false, videogenerationtimer: null, videogenerationitemindex: 0, videogenerationprocessindex: 0});
      }
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
                      mapboxAccessToken="pk.eyJ1Ijoic3BhY2VhcnQiLCJhIjoiY2x2dG5vdTUzMTJoazJqcXpyb2Z1cjYzMSJ9.eKw4WXN9hn4LHuJiBS4G4g"
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

                        {/* {((this.props.global.page !== PAGE.HOME) && (this.props.global.page !== PAGE.NEARESTTURBINE_OVERVIEW)) ? (
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
                        ) : null} */}

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
                              mapboxAccessToken=""
                              width="100vw"
                              height="100vh"
                              onLoad={this.onMapLoad} 
                              onMouseEnter={this.onMouseEnter}
                              onMouseMove={this.onMouseMove}
                              onMouseLeave={this.onMouseLeave}   
                              onClick={this.onClick}    
                              onDrag={this.onDrag}
                              onRender={this.onRender}
                              onMoveEnd={this.onMapMoveEnd}
                              onIdle={this.onIdle}
                              interactiveLayerIds={this.interactivelayers}
                              mapStyle={this.explorelayer}
                              terrain={{source: "terrainSource", exaggeration: 1.1 }}
                              attributionControl={false}
                              maxBounds={DEFAULT_MAXBOUNDS}
                              initialViewState={{
                              longitude: this.props.global.currentlng,
                              latitude: this.props.global.currentlat,
                              maxPitch: 85
                              }} >
                                <Tooltip id="ctrlpanel-tooltip" place="right" variant="light" style={{fontSize: "120%"}} />
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

                                <Canvas dpr={[1, 2]} ref={this.threeRef} latitude={50} longitude={-5} altitude={0}>
                                    <Coordinates latitude={this.props.global.turbinelat} longitude={this.props.global.turbinelng} altitude={this.state.altitude}>
                                      <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]}/>
                                      <object3D visible={(this.props.global.page !== PAGE.NEARESTTURBINE_OVERVIEW)} scale={25} rotation={[0, 1, 0]}>
                                          <WindTurbine container={this}/>
                                      </object3D>
                                    </Coordinates>
                                    {this.state.currentwindturbines.map((turbine, index) => 
                                      (
                                        <Coordinates key={index} latitude={turbine[1]} longitude={turbine[0]} altitude={1.1 * this.elevations[turbine[0].toFixed(4) + ',' + turbine[1].toFixed(4)]}>
                                          <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]}/>
                                          <object3D visible="true" scale={25} rotation={[0, 1, 0]}>
                                              <WindTurbine container={this}/>
                                          </object3D>
                                        </Coordinates>
                                      )
                                    )}

                                </Canvas>

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

                            {/* <MaplibreGL ref={this.maplibreRef}
                              width="100vw"
                              height="100vh"
                              // onLoad={this.onMapLoad} 
                              // onMouseEnter={this.onMouseEnter}
                              // onMouseMove={this.onMouseMove}
                              // onMouseLeave={this.onMouseLeave}   
                              // onClick={this.onClick}    
                              // onDrag={this.onDrag}
                              // onRender={this.onRender}
                              // onMoveEnd={this.onMapMoveEnd}
                              // onIdle={this.onIdle}
                              // interactiveLayerIds={this.interactivelayers}
                              mapStyle={this.explorelayer}
                              terrain={{source: "terrainSource", exaggeration: 1.1 }}
                              // attributionControl={false}
                              // maxBounds={DEFAULT_MAXBOUNDS}
                              initialViewState={{
                              longitude: this.props.global.currentlng,
                              latitude: this.props.global.currentlat,
                              maxPitch: 85
                              }} 
                              /> */}


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