import React, { Component } from 'react';
import './toolbar.css';
import { IonTitle, IonToolbar } from '@ionic/react';

class Toolbar extends Component {
  
    render() {
        return (
            <IonToolbar className="toolbar">
                <div className="toolbar-content">
                    <IonTitle className="toolbar-title">
                        <a href="/">WeWantWind</a>
                    </IonTitle>
                    <div className="icon-container">
                        links
                    </div>
                </div>
            </IonToolbar>
        )
    }
}

export default Toolbar;
