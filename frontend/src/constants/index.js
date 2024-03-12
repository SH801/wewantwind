/** 
 * Copyright (c) Open Carbon, 2020
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * constants/index.js 
 * 
 * Values for key constants
 */ 

export const isDev = () =>  !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
console.log("Development machine", isDev());

// URL of backend system
export const API_URL = isDev() ? "http://localhost:8000" : "";

// Base url of tile server
export const TILESERVER_BASEURL = isDev() ? "http://localhost:8080" : "https://tiles.positiveplaces.org";

// Base url of main website
export const DOMAIN_BASEURL = isDev() ? "http://localhost:8000" : ("https://wewantwind.org");

// Distance for 'local' users in miles
export const LOCAL_DISTANCE = 10;