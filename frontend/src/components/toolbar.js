import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {IonAlert, IonTitle, IonToolbar, IonText } from '@ionic/react';
import './toolbar.css';
import { global } from "../actions";

class Toolbar extends Component {
  
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
        if ((this.props.global.startinglat !== null) && (this.props.global.startinglng !== null)) 
        {
            this.setState({calculatingposition: false, calculatingnearestturbine: true});
            this.props.fetchNearestTurbine({lat: this.props.global.startinglat, lng: this.props.global.startinglng}).then(() => {
              this.setState({calculatingnearestturbine: false});
              this.props.history.push("nearestturbine");
            })
        } else {
            if (navigator.geolocation) {
                this.setState({calculatingposition: true});
                navigator.geolocation.getCurrentPosition(this.foundCurrentPosition, this.notfoundCurrentPosition);
            } else {
                this.setState({calculatingposition: false});        
            }    
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
                <IonAlert isOpen={this.state.calculatingposition} backdropDismiss={false} header="Calculating your position..." />            
                <IonAlert isOpen={this.state.positionerror} backdropDismiss={false} header="Please enable location access to use this feature" onDidDismiss={() => this.setState({positionerror: false})} buttons={['OK']}/>            
                <IonAlert isOpen={this.state.calculatingnearestturbine} backdropDismiss={false} header="Searching 20,000 locations for nearest optimal wind site..." />                        
                <IonToolbar className="toolbar" color="translucent">
                    <div className="toolbar-content">
                        <IonTitle className="toolbar-title">
                            <a onClick={() => {this.props.history.push("/");}}  style={{textDecoration: "none"}}><IonText className="wewantwind-headertext"><span style={{color:"#F5C242"}}>we</span><span style={{color:"#D8DFCE"}}>want</span><span style={{color:"#FFF"}}>wind</span></IonText></a>
                        </IonTitle>
                        <div className="links-container" >
                            <a onClick={() => {this.selectNearestWindturbine()}} className="wewantwind-link">
                                <IonText>start</IonText>
                            </a>
                            <a onClick={() => {this.props.history.push("explore");}} className="wewantwind-link">
                                <IonText>explore</IonText>
                            </a>
                            <a href="/about" className="wewantwind-link">
                                <IonText>about</IonText>
                            </a>
                        </div>
                    </div>
                </IonToolbar>
            </>
        )
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
  
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Toolbar));
