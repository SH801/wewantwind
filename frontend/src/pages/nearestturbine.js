import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { IonApp, IonHeader } from '@ionic/react';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import Toolbar from '../components/toolbar';

import { global } from "../actions";
import { point, bearing } from '@turf/turf';
import { initShaders, initVertexBuffers } from './webgl';
// import maplibregl from '!maplibre-gl'; // eslint-disable-line import/no-webpack-loader-syntax

import { useLoader, useFrame} from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, {Marker} from 'react-map-gl/maplibre';
import { Canvas, useMap } from "react-three-map/maplibre";
import { Mesh, boxGeometry, meshBasicMaterial } from "three";

import { 
  TILESERVER_BASEURL
} from "../constants";

var turf = require('@turf/turf');

const Model = () => {
  const gltf = useLoader(GLTFLoader, "./windturbine.gltf");
  return (
    <>
      <primitive object={gltf.scene} scale={1} />
    </>
  );
};

function MyAnimatedBox() {
  const gltf = useLoader(GLTFLoader, "./windturbine_blades.gltf");
  const myMesh = React.useRef();

  useFrame(({ clock }) => {
    const a = clock.getElapsedTime();
    myMesh.current.rotation.x = a;
  });

  return (
    <mesh ref={myMesh}>
      <primitive object={gltf.scene} scale={1} />
    </mesh>
  )
}
/**
 * Main template class for App 
 */
class NearestTurbine extends Component {

    constructor(props) {
      super(props);
      this.ignoremovend = false;
      this.mapRef = React.createRef();
      this.submapRef = React.createRef();
      this.style_threedimensions = require('../constants/style_threedimensions.json');
      this.style_twodimensions = require('../constants/style_twodimensions.json');
      this.satellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_threedimensions);
      this.nonsatellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_twodimensions);

      if ((this.props.global.currentlng === null) || 
          (this.props.global.currentlat === null) || 
          (this.props.global.turbinelng === null) || 
          (this.props.global.turbinelat === null)) {
          this.props.history.push("");
      } 
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
    }

    loadModel = () => {
      const gltf = useLoader(GLTFLoader, 'https://maplibre.org/maplibre-gl-js/docs/assets/34M_17/34M_17.gltf');
      const model = gltf.scene;
      return model;
    }
    
    onMapLoad = (event) => {
      var map = this.mapRef.current.getMap();
      if ((this.props.global.currentlng !== null) && 
          (this.props.global.currentlat !== null) && 
          (this.props.global.turbinelng !== null) && 
          (this.props.global.turbinelat !== null)) {

        // There's a pull request that fixes this for maplibre-gl:
        // https://github.com/maplibre/maplibre-gl-js/pull/1427
        // console.log("Setting position of camera");
        // const camera = map.getFreeCameraOptions();
        // console.log("Setting position of camera - step 1");
        // const position = [this.props.global.currentlng, this.props.global.currentlat];
        // console.log("Setting position of camera - step 2");
        // const altitude = 50000;
        
        // camera.position = maplibregl.MercatorCoordinate.fromLngLat(position, altitude);
        // console.log("Setting position of camera - step 3");

        // camera.lookAtPoint([this.props.global.turbinelng, this.props.global.turbinelat]);
        // console.log(camera);
        // map.setFreeCameraOptions(camera);

        this.reorientToTurbine(map);
      } 
      
    }
    
    reorientToTurbine = (map) => {
      var pointbearing = this.getBearing({lat: this.props.global.currentlat, lng: this.props.global.currentlng}, {lat: this.props.global.turbinelat, lng: this.props.global.turbinelng});
      map.jumpTo({ center: [this.props.global.currentlng, this.props.global.currentlat], bearing: pointbearing, duration:0});
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
          submap.fitBounds(boundingBox, {duration: 0, padding: {top: 20, bottom:20, left: 20, right: 20}});    
      }
    }

    onEyeMarkerDragEnd = (event) => {
      const lnglat = event.target.getLngLat();
      const submap = this.submapRef.current.getMap();
      this.props.setGlobalState({currentlat: lnglat.lat, currentlng: lnglat.lng}).then(() => {
        var map = this.mapRef.current.getMap();
        this.reorientToTurbine(map);
        // submap.jumpTo({ center: [this.props.global.currentlng, this.props.global.currentlat], duration:0});
      });     
    }

    onTurbineMarkerDragEnd = (event) => {
      const lnglat = event.target.getLngLat();
      const submap = this.submapRef.current.getMap();
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
    
    onMapMoveEnd = (event) => {

      if (this.ignoremovend) {
        this.ignoremovend = false;
        return;
      }

      const targetmap = event.target;
      const center = targetmap.getCenter();
      const submap = this.submapRef.current.getMap();
      this.props.setGlobalState({currentlng: center.lng, currentlat: center.lat}).then(() => {
        this.ignoremovend = true;
        this.reorientToTurbine(targetmap);
        this.reloadSubmap(submap);
      });
    }

    onSubmapMoveEnd = (event) => {
    }

    render() {
        return (
          <IonApp>
          <IonHeader>
            <Toolbar />
          </IonHeader>
          <div className="map-wrap" style={{ position: "relative" }}>

          <Toaster position="bottom-center"  containerStyle={{bottom: 20}}/>

            <div className="submap">
                <div className="submap-centre" style={{}}>
                </div>
                <Map ref={this.submapRef}
                  onLoad={this.onSubmapLoad}
                  onMoveEnd={this.onSubmapMoveEnd}
                  mapStyle={this.nonsatellitelayer}
                  attributionControl={false}
                  initialViewState={{
                    longitude: this.props.global.currentlng,
                    latitude: this.props.global.currentlat,
                    pitch: 0,
                    zoom: 18,
                    maxPitch: 10
                  }} >
                  <Marker onDragEnd={this.onTurbineMarkerDragEnd} longitude={this.props.global.turbinelng} latitude={this.props.global.turbinelat} draggable="true" anchor="bottom" >
                    <img alt="Wind turbine" width="40" src="./windturbine_black.png" />
                  </Marker>                  
                  <Marker onDragEnd={this.onEyeMarkerDragEnd} longitude={this.props.global.currentlng} latitude={this.props.global.currentlat} draggable="true" anchor="center" >
                    <img alt="Your location" width="40" src="./eye.png" />
                  </Marker>                  
                  </Map>

            </div>

            <div className="map-wrap">
              <Map ref={this.mapRef}
                onLoad={this.onMapLoad} 
                onRender={this.onRender}
                onMoveEnd={this.onMapMoveEnd}
                mapStyle={this.satellitelayer}
                terrain={{source: "terrainSource", exaggeration: 1.1 }}
                initialViewState={{
                  // longitude: this.props.global.currentlng,
                  // latitude: this.props.global.currentlat,
                  pitch: 85,
                  zoom: 18,
                  maxPitch: 85
                }} >
                      <Canvas latitude={this.props.global.turbinelat} longitude={this.props.global.turbinelng}>
                        <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]} />
                        <object3D scale={25} rotation={[0, 1, 0]}>
                          <MyAnimatedBox />
                            {/* <Model /> */}
                        </object3D>
                    </Canvas>
                </Map>
            </div> 

        </div>
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