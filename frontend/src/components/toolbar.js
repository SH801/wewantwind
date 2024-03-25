import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {IonAlert, IonTitle, IonToolbar, IonText } from '@ionic/react';
import './toolbar.css';
import { global } from "../actions";
import { TESTING_RANDOMPOINT, TOTAL_SITES, PAGE } from '../constants';

var testpagesindex = 0;

class Toolbar extends Component {
  
    constructor(props) {
        super(props);
        this.testpageslist = ['home', 'start', 'nearestturbine', 'explore'];
        this.testpagesdelay = 9000;
    }
  
    toggleTesting = () => {
        const newtesting = !this.props.global.testing;
        if (newtesting) {
            const testinginterval = setInterval(this.runTesting, this.testpagesdelay);
            this.props.setGlobalState({testing: newtesting, testinginterval: testinginterval});
        }        
        else {
            clearInterval(this.props.global.testinginterval);
            this.props.setGlobalState({testing: newtesting, testinginterval: null});
        }
    }

    runTesting = () => {
        if (testpagesindex === this.testpageslist.length) testpagesindex = 0;
        console.log("Running page:", this.testpageslist[testpagesindex]);

        if (!this.props.global.testing) {
            console.log("testing is false - not running tests");
            return;
        }

        switch(this.testpageslist[testpagesindex]) {
            case 'home':
                this.setPage(PAGE.HOME);
                break;
            case 'start': 
                this.props.parent.selectNearestWindturbine();
                break;
            case 'nearestturbine':
                this.setPage(PAGE.NEARESTTURBINE);
                break;    
            case 'explore':
                this.setPage(PAGE.EXPLORE);
                break;
            default:
                break;
        }    
        testpagesindex++;

    }

    singleBug = () => {

        var bugstate = {
            currentlat: 50.828947,
            currentlng: -0.1475211,
            startinglat: 50.828947,
            startinglng: -0.1475211,
            turbinelat: 50.92485452772702,
            turbinelng: -0.19656070746401624
        }

        this.props.parent.props.setGlobalState(bugstate);
        this.setPage(PAGE.NEARESTTURBINE_OVERVIEW);
    }

    setPage = (page) => {
        this.props.setGlobalState({pagetransitioning: true}).then(() => {
            this.props.parent.props.setPage(page);
        })
    }

    render() {
        return (
            <>
                <IonToolbar className="toolbar" color="translucent">
                    <div className="toolbar-content">
                        <IonTitle className="toolbar-title">
                            <a onClick={() => {this.props.setPage(PAGE.HOME)}}  style={{textDecoration: "none"}}><IonText className="wewantwind-headertext"><span style={{color:"#F5C242"}}>we</span><span style={{color:"#D8DFCE"}}>want</span><span style={{color:"#FFF"}}>wind</span></IonText></a>
                        </IonTitle>
                        <div className="links-container">
                            {this.props.global.testingenabled ? (
                            <>
                                <a onClick={() => {this.singleBug()}} className="wewantwind-link">
                                    <IonText>singlebug</IonText>
                                </a>
                                <a onClick={() => {this.toggleTesting()}} className="wewantwind-link">
                                    <IonText>testing</IonText>
                                </a>
                            </>
                            ) : null}
                            <a onClick={() => {this.props.parent.selectNearestWindturbine()}} className="wewantwind-link">
                                <IonText>start</IonText>
                            </a>
                            <a onClick={() => {this.setPage(PAGE.EXPLORE)}} className="wewantwind-link">
                                <IonText>explore</IonText>
                            </a>
                            <a onClick={() => {this.setPage(PAGE.ABOUT)}} className="wewantwind-link">
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
        setPage: (page) => {
            return dispatch(global.setPage(page));
        },  
    }
}  
  
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Toolbar));
