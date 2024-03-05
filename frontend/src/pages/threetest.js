
import React, { Component } from 'react';

import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import 'maplibre-gl/dist/maplibre-gl.css';
import Map from 'react-map-gl/maplibre';
import { Canvas } from "react-three-map/maplibre";

import { 
    TILESERVER_BASEURL
  } from "../constants";
  
const Model = () => {
  const gltf = useLoader(GLTFLoader, "./windturbine.gltf");
  return (
    <>
      <primitive object={gltf.scene} scale={1} />
    </>
  );
};

class ThreeTest extends Component {

    constructor(props) {
        super(props);
        this.mapRef = React.createRef();
        this.style_threedimensions = require('../constants/style_threedimensions.json');
        this.satellitelayer = this.incorporateBaseDomain(TILESERVER_BASEURL, this.style_threedimensions);
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
        
  render() {
    return (
        <div className="App" style={{width:"100vw", height:"100vh"}}>

            <div className="map-wrap">
                <Map ref={this.mapRef}
                    antialias
                    mapStyle={this.satellitelayer}
                    terrain={{source: "terrainSource", exaggeration: 1.1 }}
                    initialViewState={{
                    longitude: 0,
                    latitude: 51,
                    pitch: 60,
                    zoom: 13,
                    maxPitch: 85
                    }} >
                    <Canvas latitude={51} longitude={0}>
                        <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]} />
                        <object3D scale={50}>
                            <Model />
                        </object3D>

                    </Canvas>
        
                </Map>
            </div>
        </div>
      );
  } 
}

export default ThreeTest;
