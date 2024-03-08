import React, { Component } from 'react';
import './toolbar.css';
import { IonTitle, IonToolbar, IonText } from '@ionic/react';

class Toolbar extends Component {
  
    render() {
        return (
            <IonToolbar className="toolbar" color="translucent">
                <div className="toolbar-content">
                    <IonTitle className="toolbar-title">
                        <a href="/" style={{textDecoration: "none"}}><IonText className="wewantwind-headertext"><span style={{color:"#F5C242"}}>we</span><span style={{color:"#D8DFCE"}}>want</span><span style={{color:"#FFF"}}>wind</span></IonText></a>
                    </IonTitle>
                    <div className="links-container" >
                        <a href="/about" className="wewantwind-link">
                            <IonText>about</IonText>
                        </a>
                        <a href="/consultants" className="wewantwind-link">
                            <IonText>consultants</IonText>
                        </a>
                    </div>
                </div>
            </IonToolbar>
        )
    }
}

export default Toolbar;
