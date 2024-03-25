import { Component } from 'react';

export class Vote extends Component{
    
    constructor(props) {
      super(props);
      this._mapcontainer = props.mapcontainer;
    }
  
    onAdd(map) {
        this._map = map;
        let _this = this; 
        this._btn = document.createElement('button');
        this._btn.type = 'button';
        this._btn.setAttribute('data-tooltip-id', 'ctrlpanel-tooltip-vote');
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-vote';
        this._btn.setAttribute('data-tooltip-content', 'Vote for current site');
        this._btn.onmouseenter = function() {_this._mapcontainer.setState({showtooltipvote: true});_this._mapcontainer.helpStop();}
        this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltipvote: false});}
        this._btn.onclick = function() { 
            _this._mapcontainer.setState({
              showtooltip: false,
              name: '',
              email: '',
              contactchecked: true,
              cookieschecked: true, 
              showvote: true,
              isValidName: false,
              isValidEmail: false,
              isTouchedName: false,
              isTouchedEmail: false,
              recaptcha: undefined,
              recaptchaError: ''
            });
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
  


