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
import { initializeMap } from "../functions/map";
import { setURLState } from "../functions/urlstate";

/**
 * setGlobalState
 * 
 * Sets global state using a list of names/values represented by object
 * 
 * @param {*} object 
 * @param {*} history 
 * @param {*} location 
*/
export const setGlobalState = (object, history, location) => {
  return (dispatch, getState) => {
    // If setting turbinelat/lng, then modify URL to reflect this state
    if ((object.turbinelat !== undefined) && (object.turbinelng !== undefined)) {
      setURLState({ 'lat': object.turbinelat, 'lng': object.turbinelng}, history, location);
    }
    if ((object.currentlat !== undefined) && (object.currentlng !== undefined)) {
      setURLState({ 'vlat': object.currentlat, 'vlng': object.currentlng}, history, location);
    }
    
    dispatch({type: 'GLOBAL_SET_STATE', object: object});
    return Promise.resolve(true);
  }
}

/**
 * setPage
 * 
 * Sets page global state
 * 
 * @param {*} object 
 */
export const setPage = (page) => {
  return (dispatch, getState) => {

    const { mapref, startinglat, startinglng, currentlat, currentlng, turbinelat, turbinelng, buttons, buttonsstate, planningconstraints } = getState().global;
    var newbuttonsstate = JSON.parse(JSON.stringify(buttonsstate));

    if ((mapref === null) || (mapref.current === null)) {
      // console.log("mapref is null");
    }
    if (mapref !== null) {
      if (mapref.current !== null) {
        var map = mapref.current.getMap();
        newbuttonsstate = initializeMap(map, page, planningconstraints, buttons, buttonsstate, startinglat, startinglng, currentlat, currentlng, turbinelat, turbinelng);
      }
    }

    dispatch({type: 'GLOBAL_SET_STATE', object: {
      page: page, 
      pagetransitioning: false, 
      buttonsstate: newbuttonsstate,
      showconstraints: false
    }});
    return Promise.resolve(true);
  }  
}

/**
 * fetchNearestTurbine
 * 
 * Fetches details about nearest turbine using lat/lng
 * 
 * @param {*} position
 * @param {*} history 
 * @param {*} location 
*/
export const fetchNearestTurbine = (position, history, location) => {
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
          
          if ((res.data.turbinelat !== undefined) && (res.data.turbinelng !== undefined)) {
            setURLState({ 'lat': res.data.turbinelat, 'lng': res.data.turbinelng}, history, location);
          }
      
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
 * sendShare
 * 
 * Sends shareable link to email address with recaptcha
 * 
 * @param {*} shareparameters
 */
export const sendShare = (shareparameters) => {
  return (dispatch, getState) => {
    let headers = {"Content-Type": "application/json"};
    let body = JSON.stringify(shareparameters);

    return fetch(API_URL + "/share/", {headers, method: "POST", body})
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
          return dispatch({type: 'SEND_SHARE', data: res.data});
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
                const maxdegree = 0.015;
                const maxSouthWest = [centre[0] - maxdegree, centre[1] - maxdegree];
                const maxNorthEast = [centre[0] + maxdegree, centre[1] + maxdegree];
                if (map.getZoom() > 15) map.setZoom(15);
                if ((maxSouthWest[0] < southWest[0]) && (maxSouthWest[1] < southWest[1])) map.fitBounds([southWest, northEast], {animate: true}); 
                else map.fitBounds([maxSouthWest, maxNorthEast], {animate: true}); 
            }
          }

          return dispatch({type: 'FETCH_ENTITY', centre: centre, zoom: zoom});
        }         
      })
  }
}



/**
 * fetchRandomPoint
 * 
 * Gets random point from server
 * 
 */
export const fetchRandomPoint = () => {
  return (dispatch, getState) => {
    let headers = {"Content-Type": "application/json"};
    return fetch(API_URL + "/randompoint/", {headers, method: "POST"})
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
          return dispatch({type: 'FETCH_RANDOMPOINT', randompoint: res.data});
        }         
      })
  }
}