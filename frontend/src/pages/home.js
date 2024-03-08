import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import 'maplibre-gl/dist/maplibre-gl.css';
import { IonApp, IonHeader, IonContent, IonAlert, IonButton, IonGrid, IonRow, IonCol, IonText } from '@ionic/react';
import Toolbar from '../components/toolbar';
import '@ionic/react/css/core.css';
import { global } from "../actions";

/**
 * Main template class for App 
 */
export class Home extends Component {
  
    constructor(props) {
      super(props);
      this.state = {
        calculatingposition: false, 
        calculatingnearestturbine: false, 
        positionerror: false,
        locationnotenabled: false
      };
    }

    selectNearestWindturbine = () => {

      // this.props.fetchNearestTurbine({lat: 50.8289206, lng: -0.147542}).then(() => {
      //   this.setState({calculatingnearestturbine: false});
      //   this.props.history.push("nearestturbine");
      // })   

      // return;

      if (navigator.geolocation) {
        this.setState({calculatingposition: true});
        navigator.geolocation.getCurrentPosition(this.foundCurrentPosition, this.notfoundCurrentPosition);
      } else {
        this.setState({calculatingposition: false});

        console.log("Geolocation not supported");
      }
    }

    foundCurrentPosition = (position) => {
      this.setState({calculatingposition: false, calculatingnearestturbine: true});
      console.log("Identified position");
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      this.props.fetchNearestTurbine({lat: latitude, lng: longitude}).then(() => {
        this.setState({calculatingnearestturbine: false});
        this.props.history.push("nearestturbine");
      })
    }
    
    notfoundCurrentPosition = () => {
      this.setState({calculatingposition: false, positionerror: true});

      console.log("Unable to retrieve your location");
    }

    render() {
        return (
          <>
            <IonApp>
              <IonHeader translucent="true" className="ion-no-border">
                <Toolbar />
              </IonHeader>
              <IonContent fullscreen="true" style={{position: "absolute", top: "0px"}}>
                <IonAlert isOpen={this.state.calculatingposition} backdropDismiss={false} header="Calculating your position..." />            
                <IonAlert isOpen={this.state.positionerror} backdropDismiss={false} header="Please enable location access to use this feature" onDidDismiss={() => this.setState({positionerror: false})} buttons={['OK']}/>            
                <IonAlert isOpen={this.state.calculatingnearestturbine} backdropDismiss={false} header="Searching 20,000 locations for nearest optimal wind site..." />            
                  <div className="centred-container background-image">
                    <IonGrid>
                      <IonRow>
                      <IonCol size="12" style={{textAlign: "center"}}>
                          <IonText className="wewantwind-largetext"><span style={{color:"#F5C242"}}>we</span><span style={{color:"#D8DFCE"}}>want</span><span style={{color:"#FFF"}}>wind</span></IonText>
                        </IonCol>
                      </IonRow>
                      <IonRow className="ion-align-items-center">
                        <IonCol size="12" style={{textAlign: "center"}}>
                        <IonButton shape="round" onClick={() => {this.selectNearestWindturbine()}}>Find nearest potential wind site</IonButton>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                    <IonText>
                    </IonText>
                  </div>
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
