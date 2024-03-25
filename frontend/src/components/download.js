import { Component } from 'react';

export class Download extends Component{
    
    constructor(props) {
      super(props);
      this._mapcontainer = props.mapcontainer;
    }
  
    onAdd(map) {
        this._map = map;
        let _this = this; 
        this._btn = document.createElement('button');
        this._btn.type = 'button';
        this._btn.setAttribute('data-tooltip-id', 'ctrlpanel-tooltip-download');
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-download';
        this._btn.setAttribute('data-tooltip-content', 'Download planning documents');
        this._btn.onmouseenter = function() {_this._mapcontainer.setState({showtooltipdownload: true});_this._mapcontainer.helpStop();}
        this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltipdownload: false});}
        this._btn.onclick = function() { 
            _this._mapcontainer.setState({showtooltip: false, showdownload: true});
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
  


