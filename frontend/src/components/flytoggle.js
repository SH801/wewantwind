import { Component } from 'react';
import toast from 'react-hot-toast';

export class FlyToggle extends Component{
    
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
      if (this._mapcontainer.state.flying) {
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-flytoggle-landing';
        this._btn.setAttribute('data-tooltip-content', 'Stop flying');
      } else {
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-flytoggle-takeoff';
        this._btn.setAttribute('data-tooltip-content', 'Fly around turbine');
      }
      this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltip: true});}
      this._btn.onclick = function() { 
        var currflying = _this._mapcontainer.state.flying;
        var newflying = !currflying;
        _this._mapcontainer.setState({showtooltip: false});
        _this._mapcontainer.props.setGlobalState({flying: newflying, flyingindex: 0});
        if (newflying) {
          toast.success('Now flying!');
          this.setAttribute('data-tooltip-content', 'Stop flying');
          _this._btn.className = 'wewantwind maplibregl-ctrl-flytoggle-landing';
          _this._mapcontainer.flyingStart();
        } else {
          this.setAttribute('data-tooltip-content', 'Fly around turbine');
          _this._btn.className = 'wewantwind maplibregl-ctrl-flytoggle-takeoff';
          _this._mapcontainer.flyingStop();
        } 
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
  