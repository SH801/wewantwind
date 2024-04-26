import { Component } from 'react';

export class Site extends Component{
    
    constructor(props) {
      super(props);
      this._mapcontainer = props.mapcontainer;
    }
  
    onAdd(map) {
        this._map = map;
        let _this = this; 
        this._btn = document.createElement('button');
        this._btn.type = 'button';
        this._btn.setAttribute('data-tooltip-id', 'ctrlpanel-tooltip-site');
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-site';
        this._btn.setAttribute('data-tooltip-content', 'Choose wind site position');
        this._btn.onmouseenter = function() {_this._mapcontainer.helpStop();_this._mapcontainer.setState({showtooltipsite: true});}
        this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltipsite: false});}
        this._btn.onclick = function() { 
            _this._mapcontainer.setState({showtooltipsite: false, showsite: !_this._mapcontainer.state.showsite});
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
  


