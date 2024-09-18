import { Component } from 'react';
import { mapRefreshPlanningApplications } from '../functions/map';

export class PlanningApplications extends Component{
    
    constructor(props) {
      super(props);
      this._mapcontainer = props.mapcontainer;
    }
  
    onAdd(map) {
      this._map = map;
      this._timer = null;
      let _this = this; 
      this._btn = document.createElement('button');
      this._btn.type = 'button';
      this._btn.setAttribute('data-tooltip-id', 'ctrlpanel-tooltip');
      this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-showplanningapplications-off';
      this._btn.setAttribute('data-tooltip-content', 'Show planning applications');
      this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltip: true});}
      this._btn.onclick = function() { 
        if (_this._mapcontainer.state.showplanningapplications) {
          this.setAttribute('data-tooltip-content', 'Show planning applications');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showplanningapplications-off';
        } else {
          this.setAttribute('data-tooltip-content', 'Hide planning applications');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showplanningapplications-on';
        }        
        mapRefreshPlanningApplications(!(_this._mapcontainer.state.showplanningapplications), _this._map);          
        _this._mapcontainer.setState({showtooltip: false, showplanningapplications: !_this._mapcontainer.state.showplanningapplications});
      };
      
      this._container = document.createElement('div');
      this._container.className = 'maplibregl-ctrl wewantwind-ctrl-group';
      this._container.appendChild(this._btn);
  
      return this._container;
    }
  
    onRemove() {
      if (this._container.parentNode !== null) {
        this._container.parentNode.removeChild(this._container);
      }
      this._map = undefined;
    }
  }
  