/** 
 * Copyright (c) Open Carbon, 2020
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * reducers/initializers.js 
 * 
 * react-redux reducer initializers
 */ 

import { 
    PAGE,
    TURBINETOWERHEIGHT_DEFAULT,
    TURBINEBLADERADIUS_DEFAULT
 } from '../constants';

// Set up initial state of some global variables using constants
export const initialStateGlobal = {
    page: PAGE.HOME,
    pagetransitioning: false,
    testingenabled: false,
    testing: false,
    testinginterval: null,
    testpagesindex: 0,
    turbinetowerheight: TURBINETOWERHEIGHT_DEFAULT,
    turbinebladeradius: TURBINEBLADERADIUS_DEFAULT,
    windturbine: 'WeWantWind Average Turbine',
    mapref: null,
    startinglat: null,
    startinglng: null,
    currentlat: null,
    currentlng: null,
    turbinelat: null,
    turbinelng: null,
    distance_m: null,
    distance_km: null,
    distance_mi: null,
    localpeople: null,
    geojson: null,
    centre: null,
    zoom: null,
    windspeed: null,
    randompoint: null,
    showwind: false,
    showconstraints: false,
    showgrid: false,
    helpInterval: null,
    planningconstraints: {
        "all": true,
        "wind": false,
        "landscape": false,
        "heritage": false,
        "residential": false,
        "ecology": false,
        "safety": false,
        "aviation_mod": false
    },
    buttons: null,
    buttonsstate: {
        'site':     false,
        'vote':     false,
        'download': false,
        'message':  false,
        'share':    false,
        'fly':      false,
        'video':    false,
        'wind':     false,
        'planning': false,
        'grid':     false
    }
};
