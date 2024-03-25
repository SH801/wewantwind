import { Component } from 'react';
import { mapRefreshElectricity } from '../functions/map';

export class Grid extends Component{
    
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
      this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-showgrid-off';
      this._btn.setAttribute('data-tooltip-content', 'Show electricity grid');
      this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltip: true});}
      this._btn.onclick = function() { 
        if (_this._mapcontainer.state.showgrid) {
          this.setAttribute('data-tooltip-content', 'Show electricity grid');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showgrid-off';
        } else {
          this.setAttribute('data-tooltip-content', 'Hide electricity grid');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showgrid-on';
        }        
        mapRefreshElectricity(!(_this._mapcontainer.state.showgrid), _this._map);          
        _this._mapcontainer.setState({showtooltip: false, showgrid: !_this._mapcontainer.state.showgrid});
      };
      
      this._container = document.createElement('div');
      this._container.className = 'maplibregl-ctrl wewantwind-ctrl-group';
      this._container.appendChild(this._btn);
  
      return this._container;
    }
  
    onRemove() {
      this._container.parentNode.removeChild(this._container);
      this._map = undefined;
    }
  }
  