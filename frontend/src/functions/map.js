import { PLANNING_CONSTRAINTS } from "../constants";

export function mapRefreshPlanningConstraints(showplanningconstraints, planningconstraints, map) {
    var planningconstraints_sections = Object.keys(PLANNING_CONSTRAINTS);
    for(let i = 0; i < planningconstraints_sections.length; i++) {
      var planningconstraint_section = planningconstraints_sections[i];
      var section_status = planningconstraints[planningconstraint_section];
      if (!showplanningconstraints) section_status = false;
      for(let j = 0; j < PLANNING_CONSTRAINTS[planningconstraint_section]['layers'].length; j++) {
        var id = PLANNING_CONSTRAINTS[planningconstraint_section]['layers'][j];
        if (map.getLayer(id)) {
          if (section_status) map.setLayoutProperty(id, 'visibility', 'visible');
          else map.setLayoutProperty(id, 'visibility', 'none');
        }
      }
    }
}

export function mapRefreshWindspeed(showwindspeed, map) {
    if (showwindspeed) map.setLayoutProperty('windspeed', 'visibility', 'visible');
    else map.setLayoutProperty('windspeed', 'visibility', 'none');
}

export function mapRefreshElectricity(showelectricity, map) {
    if (showelectricity) {
        map.setLayoutProperty('grid', 'visibility', 'visible');
        map.setLayoutProperty('grid_outline', 'visibility', 'visible');
        map.setLayoutProperty('grid_substation', 'visibility', 'visible');
        map.setLayoutProperty('grid_label', 'visibility', 'visible');
    } 
    else {
        map.setLayoutProperty('grid', 'visibility', 'none');
        map.setLayoutProperty('grid_outline', 'visibility', 'none');
        map.setLayoutProperty('grid_substation', 'visibility', 'none');
        map.setLayoutProperty('grid_label', 'visibility', 'none');
    }
}
