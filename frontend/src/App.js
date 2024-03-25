import './App.css';
import * as React from 'react';
import { Component } from 'react';
import { Route, Switch, BrowserRouter } from 'react-router-dom';
import { createStore, applyMiddleware } from "redux";
import { Provider } from "react-redux";
import {thunk} from 'redux-thunk';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@ionic/react/css/core.css';

import WeWantWindApp from "./reducers";

import Main from './pages/main.js';
import { setupIonicReact } from '@ionic/react';
 
setupIonicReact();

let store = createStore(WeWantWindApp, applyMiddleware(thunk));

class App extends Component {
  render() {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <Switch>
            <Route path="/" render={(props) => (<Main />)} />
          </Switch>
        </BrowserRouter>
      </Provider>
      );      
  }
}

export default App;
