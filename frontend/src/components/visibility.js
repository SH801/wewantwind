import { Component } from 'react';

export class Visibility extends Component{
    
    constructor(props) {
      super(props);
      this._mapcontainer = props.mapcontainer;
    }
  
    onAdd(map) {
        this._map = map;
        let _this = this; 
        this._btn = document.createElement('button');
        this._btn.type = 'button';
        this._btn.setAttribute('data-tooltip-id', 'ctrlpanel-tooltip-visibility');
        if (_this._mapcontainer.state.showvisibility) {
          this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-visibility-on';
        } else {
          this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-visibility-off';
        }
        this._btn.setAttribute('data-tooltip-content', 'Show/hide visibility layer');
        this._btn.onmouseenter = function() {_this._mapcontainer.helpStop();_this._mapcontainer.setState({showtooltipvisibility: true});}
        this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltipvisibility: false});}
        this._btn.onclick = function() { 
          if (_this._mapcontainer.state.showvisibility)   _this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-visibility-off';
          else                                      _this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-visibility-on';            
          _this._mapcontainer.setState({showtooltipvisibility: false, showvisibility: !_this._mapcontainer.state.showvisibility});
          _this._mapcontainer.setVisibility(!_this._mapcontainer.state.showvisibility);          
        };
      
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl wewantwind-ctrl-group';
        this._container.appendChild(this._btn);
  
        return this._container;
    }

    deactivateButton() {
      this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-visibility-off';
    }

    onRemove() {
      if (this._container.parentNode !== null) {
        this._container.parentNode.removeChild(this._container);
      }
      this._map = undefined;
    }
  }
  


