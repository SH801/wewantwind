import { Component } from 'react';
import toast from 'react-hot-toast';

export class RecordVideo extends Component{
    
    constructor(props) {
      super(props);
      this._mapcontainer = props.mapcontainer;
      this._encoder = null;
      this._frame = null;
      this._framerate = 30;
      this._timer = null;
    }
  
    onAdd(map) {
      this._map = map;
      let _this = this; 
      this._btn = document.createElement('button');
      this._btn.type = 'button';
      this._btn.setAttribute('data-tooltip-id', 'ctrlpanel-tooltip');
      if (this._mapcontainer.state.recording) {
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-recordvideo-stop';
        this._btn.setAttribute('data-tooltip-content', 'Stop recording video');
      } else {
        this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-recordvideo-start';
        this._btn.setAttribute('data-tooltip-content', 'Start recording video');
      }
      this._btn.onmouseleave = function() {_this._mapcontainer.setState({showtooltip: true});}
      this._btn.onclick = function() { 
        var recording = _this._mapcontainer.state.recording;
        recording = !recording;
        _this._mapcontainer.setState({showtooltip: false, recording: recording})
        // We trigger render after starting/stopping recording in order to show/hide logo
        _this._map._render();
        if (recording) {
          this.setAttribute('data-tooltip-content', 'Stop recording video');
          _this._btn.className = 'wewantwind-ctrl-icon maplibregl-ctrl-recordvideo-stop';
  
          // Use MediaRecorder to record video as it's most efficient
          // Tried using MP4 conversion but too CPU intensive when main app is already working hard
          const canvas = _this._map.getCanvas();
          const data = []; 
          const stream = canvas.captureStream(25); 
          const mediaRecorder = new MediaRecorder(stream, {videoBitsPerSecond: 10000000});        
          _this._mapcontainer.setState({mediarecorder: mediaRecorder});
          mediaRecorder.ondataavailable = (e) => data.push(e.data);
          mediaRecorder.onstop = (e) => {
      
            const anchor = document.createElement("a");
            anchor.href =  URL.createObjectURL(new Blob(data, {type: "video/webm;codecs=h264"}));
            const now = new Date();
            const timesuffix = now.toISOString().substring(0,19).replaceAll('T', ' ').replaceAll(':', '-');
            anchor.download = "wewantwind.org - " + timesuffix;
            anchor.click();  
          }
  
          mediaRecorder.start();
          toast.success('Recording started');  
        } else {
          this.setAttribute('data-tooltip-content', 'Start recording video');
          _this._btn.className = 'maplibregl-ctrl-icon maplibregl-ctrl-recordvideo-start';
  
          if (_this._mapcontainer.state.mediarecorder) {
            _this._mapcontainer.state.mediarecorder.stop();
            _this._mapcontainer.setState({mediarecorder: null});
          }
            
          toast.success('Recording finished - saved to your downloads');  
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