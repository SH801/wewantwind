/** 
 * Copyright (c) Open Carbon, 2020
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * reducers/global.js 
 * 
 * Reducer for global redux object
 * 
 * GLOBAL_SET_STATE: Updates global variable(s) using names/values in object
 * SET_TIME_RANGE: Updates time-specific variables
 * SET_AREA_SCALE: Updates areascale property
 */ 

import { initialStateGlobal } from "./initializers"

export default function selector(state=initialStateGlobal, action) {

    let newState = {...state};

    switch (action.type) {

        case 'GLOBAL_SET_STATE':
            Object.keys(action.object).forEach((key) => newState[key] = action.object[key]);                
            return newState;

        case 'FETCH_NEARESTTURBINE':
            newState = {...newState,             
                currentlat: action.data.currentlat,
                currentlng: action.data.currentlng,
                turbinelat: action.data.turbinelat,
                turbinelng: action.data.turbinelng,
                distance_m: action.data.distance_m,
                distance_km: action.data.distance_km,
                distance_mi: action.data.distance_mi
            };
            return newState;
        
        default:
            return state;
    }
}
