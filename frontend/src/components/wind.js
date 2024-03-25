import { Component } from 'react';
import { mapRefreshWindspeed } from '../functions/map';

export class Wind extends Component{
    
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
      this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-showwind-off';
      this._btn.setAttribute('data-tooltip-content', 'Show wind speeds');
      this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltip: true});}
      this._btn.onclick = function() { 
        _this._mapcontainer.props.setGlobalState({windspeed: null});
        if (_this._mapcontainer.state.showwind) {
          this.setAttribute('data-tooltip-content', 'Show wind speeds');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showwind-off';
        } else {
          this.setAttribute('data-tooltip-content', 'Hide wind speeds');
          _this._btn.className = 'wewantwind maplibregl-ctrl-showwind-on';
        }        
        mapRefreshWindspeed(!(_this._mapcontainer.state.showwind), _this._map);          
        _this._mapcontainer.setState({showtooltip: false, showwind: !_this._mapcontainer.state.showwind});
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
  