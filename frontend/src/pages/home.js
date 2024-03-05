import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import 'maplibre-gl/dist/maplibre-gl.css';
import { IonApp, IonHeader, IonContent, IonAlert, IonButton } from '@ionic/react';
import Toolbar from '../components/toolbar';
import '@ionic/react/css/core.css';
import { global } from "../actions";

/**
 * Main template class for App 
 */
export class Home extends Component {
  
    constructor(props) {
      super(props);
      this.state = {calculatingposition: false, calculatingnearestturbine: false, locationnotenabled: false};
    }

    selectNearestWindturbine = () => {

      this.props.fetchNearestTurbine({lat: 50.8289206, lng: -0.147542}).then(() => {
        this.setState({calculatingnearestturbine: false});
        this.props.history.push("nearestturbine");
      })   

      return;

      // if (navigator.geolocation) {
      //   this.setState({calculatingposition: true});
      //   navigator.geolocation.getCurrentPosition(this.foundCurrentPosition, this.notfoundCurrentPosition);
      // } else {
      //   this.setState({calculatingposition: false});

      //   console.log("Geolocation not supported");
      // }
    }

    foundCurrentPosition = (position) => {
      this.setState({calculatingposition: false, calculatingnearestturbine: true});
      console.log("Identified position");
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      // console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
      this.props.fetchNearestTurbine({lat: latitude, lng: longitude}).then(() => {
        this.setState({calculatingnearestturbine: false});
        this.props.history.push("nearestturbine");
      })
    }
    
    notfoundCurrentPosition = () => {
      console.log("Unable to retrieve your location");
    }

    render() {
        return (
          <>
          <IonApp>
          <IonHeader>
            <Toolbar />
          </IonHeader>
          <IonContent>
            <IonAlert isOpen={this.state.calculatingposition} header="Calculating your position..." />            
            <IonAlert isOpen={this.state.calculatingnearestturbine} header="Searching 20,000 locations for nearest optimal wind site..." />            
            <IonButton onClick={() => {this.selectNearestWindturbine()}}>Find nearest potential wind turbine site!</IonButton>
          </IonContent>

        </IonApp>

          </>
  
            );
    }
}

export const mapStateToProps = state => {
  return {
    global: state.global
  }
}
    
export const mapDispatchToProps = dispatch => {
  return {
      setGlobalState: (globalstate) => {
        return dispatch(global.setGlobalState(globalstate));
      },  
      fetchNearestTurbine: (position) => {
        return dispatch(global.fetchNearestTurbine(position));
      },      
  }
}  

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Home));
