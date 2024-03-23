import './App.css';
import * as React from 'react';
import { Component } from 'react';
import { Route, Switch, BrowserRouter } from 'react-router-dom';

import Home from './pages/home.js';
import { createStore, applyMiddleware } from "redux";
import { Provider } from "react-redux";
// import thunk from "redux-thunk";
import {thunk} from 'redux-thunk';
import { loadReCaptcha } from 'react-recaptcha-google'

import WeWantWindApp from "./reducers";

import SelectNearestTurbine from './pages/selectnearestturbine.js';
import NearestTurbine from './pages/nearestturbine.js';
import Explore from './pages/explore.js';
import Main from './pages/main.js';
import { setupIonicReact } from '@ionic/react';
 
setupIonicReact();

let store = createStore(WeWantWindApp, applyMiddleware(thunk));

class App extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    loadReCaptcha();    
  }

  render() {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <Switch>
            <Route exact path="/selectnearestturbine" render={(props) => (<SelectNearestTurbine />)} />
            <Route exact path="/nearestturbine" render={(props) => (<NearestTurbine />)} />
            <Route exact path="/explore" render={(props) => (<Explore />)} />
            {/* <Route path="/" render={(props) => (<Home />)} /> */}
            <Route path="/" render={(props) => (<Main />)} />
          </Switch>
        </BrowserRouter>
      </Provider>
      );      
  }
}

export default App;
