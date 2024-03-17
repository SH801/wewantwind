import { Component } from 'react';

export class Spacer extends Component{
      
    onAdd(map) {
      this._container = document.createElement('div');
      this._container.className = 'maplibregl-ctrl wewantwind-ctrl-group maplibregl-ctrl-spacer';
      return this._container;
    }
  
    onRemove() {
      this._container.parentNode.removeChild(this._container);
      this._map = undefined;
    }
  }
  