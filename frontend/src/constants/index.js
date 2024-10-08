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

// Whether to run testing using random points
export var TESTING_RANDOMPOINT = true;

// URL of fetch system
export const FETCHAPI_URL = "https://positiveplaces.org";

// Local URL of fetch system
export const FETCHAPI_LOCALURL = "http://localhost";

// Base url of tile server
export const TILESERVER_BASEURL = isDev() ? "http://localhost:8080" : "https://tiles.wewantwind.org";

// Base url of main website
export const DOMAIN_BASEURL = isDev() ? "http://localhost:8000" : ("https://wewantwind.org");

// Distance for 'local' users in miles
export const LOCAL_DISTANCE = 10;

// Zoom to go from 2D to 3D
export const THREED_ZOOM = 13;

// Total number of datasets
export const TOTAL_SITES = "179,273";

// Animation interval
export const ANIMATION_INTERVAL = 800;

// Default height of 3D turbine tower
export const TURBINETOWERHEIGHT_DEFAULT = 108.3;

// Default radius of 3D turbine blades
export const TURBINEBLADERADIUS_DEFAULT = (138.5 / 2);

// Default padding for single turbine
export const TURBINE_PADDING = 0.5;

// Different page types
export const PAGE = {
    HOME: 0,
    NEARESTTURBINE_OVERVIEW: 1,
    NEARESTTURBINE: 2,
    EXPLORE: 3,
    ABOUT: 4,
    SHOWTURBINE: 5,
}

// Buttons on each page
export const PAGEBUTTONS = [
    [],
    [],
    ['vote', 'download', 'message', 'share', 'visibility', 'fly', 'video'],
    ['site', 'vote', 'download', 'message', 'share',  'visibility', 'fly', 'video', 'wind', 'planning', 'grid', 'planningapplications'],
    [],
    ['vote', 'download', 'message', 'share', 'visibility', 'fly', 'video'],
]

// Default maxbounds 
export const DEFAULT_MAXBOUNDS = [
    [
        -12.456802770948485,
        48.921496099104246
    ],
    [
        3.5121541807384062, 
        61.59071211434002 
    ]
]

// Default centre
export const DEFAULT_CENTRE = [
    -3.429071942460162,
    55.281960919035086
]

// Planning constraints
export const PLANNING_CONSTRAINTS = {
    "all":
    {
        "description": "All constraints (single layer)",
        "colour": "grey",
        "layers":
        [
            "constraint_all_fill_colour",
            "constraint_all_fill_pattern"
        ]
    },
    "wind": 
    {
        "description": "Inadequate wind",
        "colour": "blue",
        "layers":
        [
            "constraint_wind_fill_colour"
        ]
    },
    "landscape": 
    {
        "description": "Landscape / visual impact",
        "colour": "chartreuse",
        "layers": 
        [
            "constraint_landscape_and_visual_impact_fill_colour",
            "constraint_landscape_and_visual_impact_fill_pattern"
        ]
    },
    "heritage":
    {
        "description": "Heritage impact",
        "colour": "darkgoldenrod",
        "layers": 
        [
            "constraint_heritage_impacts_fill_colour",
            "constraint_heritage_impacts_fill_pattern"
        ]
    },
    "residential":
    {
        "description": "Too close to residential",
        "colour": "darkorange",
        "layers":
        [
            "constraint_separation_distance_to_residential_fill_colour",
            "constraint_separation_distance_to_residential_fill_pattern"
        ]
    },
    "ecology":
    {
        "description": "Ecology / wildlife",
        "colour": "darkgreen",
        "layers":
        [
            "constraint_ecology_and_wildlife_fill_colour",
            "constraint_ecology_and_wildlife_fill_pattern"
        ]
    },
    "aviation_mod":
    {
        "description": "Aviation / MOD",
        "colour": "purple",
        "layers": 
        [
            "constraint_aviation_and_exclusion_areas_fill_colour",
            "constraint_aviation_and_exclusion_areas_fill_pattern"
        ]    
    },
    "safety":
    {
        "description": "Unsafe distance (transportation, powerlines, etc)",
        "colour": "red",
        "layers": 
        [
            "constraint_other_technical_constraints_lo_fill_colour",
            "constraint_other_technical_constraints_lo_fill_pattern",
            "constraint_other_technical_constraints_hi_fill_colour",
            "constraint_other_technical_constraints_hi_fill_pattern"
        ]
    }
};