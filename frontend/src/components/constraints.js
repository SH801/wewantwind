import { Component } from 'react';
import { mapRefreshPlanningConstraints } from '../functions/map';

export class Constraints extends Component{
    
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
      this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-showconstraints-off';
      this._btn.setAttribute('data-tooltip-content', 'Show planning constraints');
      this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltip: true});}
      this._btn.onclick = function() { 
        // _this._mapcontainer.props.setGlobalState({windspeed: null});
        if (_this._mapcontainer.props.global.showconstraints) {
          this.setAttribute('data-tooltip-content', 'Show planning constraints');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showconstraints-off';
        } else {
          this.setAttribute('data-tooltip-content', 'Hide planning constraints');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showconstraints-on';
        }        
        mapRefreshPlanningConstraints(!(_this._mapcontainer.props.global.showconstraints), 
                                        _this._mapcontainer.props.global.planningconstraints, 
                                        _this._map);          
        _this._mapcontainer.props.setGlobalState({showconstraints: !_this._mapcontainer.props.global.showconstraints});
        _this._mapcontainer.setState({showtooltip: false});
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
  