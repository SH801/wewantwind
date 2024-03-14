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

import { API_URL, FETCHAPI_URL } from "../constants";

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
          return dispatch({type: 'FETCH_NEARESTTURBINE', data: res.data});
        }         
      })
  }
}


/**
 * castVote
 * 
 * Sends provisional vote to server
 * 
 * @param {*} voteparameters
 */
export const castVote = (voteparameters) => {
  return (dispatch, getState) => {
    let headers = {"Content-Type": "application/json"};
    let body = JSON.stringify(voteparameters);

    return fetch(API_URL + "/vote/", {headers, method: "POST", body})
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
          return dispatch({type: 'CAST_VOTE', data: res.data});
        }         
      })
  }
}

/**
 * getLocalPeople
 * 
 * Sends provisional vote to server
 * 
 * @param {*} position
 */
export const getLocalPeople = (position) => {
  return (dispatch, getState) => {
    let headers = {"Content-Type": "application/json"};
    let body = JSON.stringify(position);

    return fetch(API_URL + "/localpeople/", {headers, method: "POST", body})
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
          console.log(res.data);
          return dispatch({type: 'GET_LOCALPEOPLE', data: res.data});
        }         
      })
  }
}

/**
 * sendMessage
 * 
 * Sends provisional message to server
 * 
 * @param {*} messageparameters
 */
export const sendMessage = (messageparameters) => {
  return (dispatch, getState) => {
    let headers = {"Content-Type": "application/json"};
    let body = JSON.stringify(messageparameters);

    return fetch(API_URL + "/message/", {headers, method: "POST", body})
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
          return dispatch({type: 'SEND_MESSAGE', data: res.data});
        }         
      })
  }
}


/**
 * fetchEntity
 * 
 * Fetch entity from backend server using search criteria
 * 
 * @param {*} searchcriteria
 */
export const fetchEntity = (searchcriteria) => {
  return (dispatch, getState) => {
    const { mapref } = getState().global;
    let headers = {"Content-Type": "application/json"};
    let body = JSON.stringify(searchcriteria);
    return fetch(FETCHAPI_URL + "/entities/", {headers, method: "POST", body})
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
          var centre = null;
          var zoom = null;
          if (res.data.bounds !== undefined) {
            if (mapref) {
                var map = mapref.current.getMap();
                const southWest = [res.data.bounds[0], res.data.bounds[1]]
                const northEast = [res.data.bounds[2], res.data.bounds[3]]
                centre = [(res.data.bounds[0] + res.data.bounds[2]) / 2, 
                          (res.data.bounds[1] + res.data.bounds[3]) / 2];
                if (map.getZoom() > 15) map.setZoom(15);
                map.fitBounds([southWest, northEast], {animate: true}); 
            }
          }

          return dispatch({type: 'FETCH_ENTITY', centre: centre, zoom: zoom});
        }         
      })
  }
}