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
import { point, distance} from "@turf/turf";

export default function selector(state=initialStateGlobal, action) {

    let newState = {...state};

    switch (action.type) {

        case 'GLOBAL_SET_STATE':
            Object.keys(action.object).forEach((key) => newState[key] = action.object[key]);       

            // If setting currentlat/lng or turbinelat/lng then update distance
            var currentpos = point([newState.currentlng, newState.currentlat]);
            var turbinepos = point([newState.turbinelng, newState.turbinelat]);
            var updatedistance = false;
            if ((action.object['currentlat'] !== undefined) && (action.object['currentlng'] !== undefined)) {
                currentpos = point([action.object['currentlng'], action.object['currentlat']]);
                updatedistance = true;
            }
            if ((action.object['turbinelat'] !== undefined) && (action.object['turbinelng'] !== undefined)) {
                turbinepos = point([action.object['turbinelng'], action.object['turbinelat']]);
                updatedistance = true;
            }

            if (updatedistance) {
                newState['distance_mi'] = distance(currentpos, turbinepos, {units: 'miles'});
                newState['distance_km'] = distance(currentpos, turbinepos, {units: 'kilometers'});
                newState['distance_m'] = 1000 * newState['distance_mi'];
            }       
                    
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
