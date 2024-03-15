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
export const TESTING_RANDOMPOINT = true;

// URL of fetch system
export const FETCHAPI_URL = "https://positiveplaces.org";

// Base url of tile server
export const TILESERVER_BASEURL = isDev() ? "http://localhost:8080" : "https://tiles.positiveplaces.org";

// Base url of main website
export const DOMAIN_BASEURL = isDev() ? "http://localhost:8000" : ("https://wewantwind.org");

// Distance for 'local' users in miles
export const LOCAL_DISTANCE = 10;

// Zoom to go from 2D to 3D
export const THREED_ZOOM = 13;

// Default maxbounds 
export const DEFAULT_MAXBOUNDS = [
    [
        -9.51967906903984584,
        49.28352918042221376
    ],
    [
        2.66153518411952117, 
        61.28039265764795118 
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
            "constraint_other_technical_constraints_fill_colour",
            "constraint_other_technical_constraints_fill_pattern"
        ]
    }
};