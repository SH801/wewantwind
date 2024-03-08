/** 
 * Copyright (c) Open Carbon, 2020
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * action/global.js 
 * 
 * Actions for global redux object
 */ 

import { API_URL } from "../constants";

/**
 * setGlobalState
 * 
 * Sets global state using a list of names/values represented by object
 * 
 * @param {*} object 
 */
export const setGlobalState = (object) => {
    return (dispatch, getState) => {
      dispatch({type: 'GLOBAL_SET_STATE', object: object});
      return Promise.resolve(true);
    }
}

/**
 * fetchNearestTurbine
 * 
 * Fetches details about nearest turbine using lat/lng
 * 
 * @param {*} position
 */
export const fetchNearestTurbine = (position) => {
  return (dispatch, getState) => {
    let headers = {"Content-Type": "application/json"};
    let body = JSON.stringify(position);

    return fetch(API_URL + "/nearestturbine/", {headers, method: "POST", body})
      .then(res => {
        if (res.status < 500) {
          return res.json().then(data => {
            return {status: res.status, data};
          })
        } else {
          console.log("Server Error!");
          throw res;
        }
      })
      .then(res => {
        if (res.status === 200) {
          // res.data = {
          //   currentlat: 50.9289206,
          //   currentlng: -0.147542,
          //   distance_km: 1.17721090648,
          //   distance_m: 1177.21090648,
          //   distance_mi: 0.7314849444742703,
          //   turbinelat: 50.91889617443655,
          //   turbinelng: -0.14215200414820078
          // };

          return dispatch({type: 'FETCH_NEARESTTURBINE', data: res.data});
        }         
      })
  }
}


