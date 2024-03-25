import { Component } from 'react';
import toast from 'react-hot-toast';
import { LOCAL_DISTANCE } from '../constants';

export class Message extends Component{
    
    constructor(props) {
      super(props);
      this._mapcontainer = props.mapcontainer;
    }
  
    onAdd(map) {
        this._map = map;
        let _this = this; 
        this._btn = document.createElement('button');
        this._btn.type = 'button';
        this._btn.setAttribute('data-tooltip-id', 'ctrlpanel-tooltip');
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-message';
        this._btn.setAttribute('data-tooltip-content', 'Contact interested local people');
        this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltip: true});}
        this._btn.onclick = function() { 
          _this._mapcontainer.props.getLocalPeople({
            lat: _this._mapcontainer.props.global.startinglat, 
            lng: _this._mapcontainer.props.global.startinglng 
          }).then(() => {
            if (_this._mapcontainer.props.global.localpeople === 0) {
              toast.error('No contactable users within ' + String(LOCAL_DISTANCE) + ' miles');
            } else {
              _this._mapcontainer.setState({
                showtooltip: false,
                name: '',
                email: '',
                showmessage: true,
                isValidName: false,
                isValidEmail: false,
                isTouchedName: false,
                isTouchedEmail: false,
                recaptcha: undefined,
                recaptchaError: ''
              });    
            }
          })
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
  


