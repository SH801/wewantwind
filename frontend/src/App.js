import './App.css';
import * as React from 'react';
import { Route, Switch, BrowserRouter } from 'react-router-dom';

import Home from './pages/home.js';
import { createStore, applyMiddleware } from "redux";
import { Provider } from "react-redux";
// import thunk from "redux-thunk";
import {thunk} from 'redux-thunk';
import WeWantWindApp from "./reducers";

import NearestTurbine from './pages/nearestturbine.js';
import ThreeTest from './pages/threetest.js';
import { setupIonicReact } from '@ionic/react';
 
setupIonicReact();

let store = createStore(WeWantWindApp, applyMiddleware(thunk));

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Switch>
          <Route exact path="/threetest" render={(props) => (<ThreeTest />)} />
          <Route exact path="/nearestturbine" render={(props) => (<NearestTurbine />)} />
          <Route path="/" render={(props) => (<Home />)} />
        </Switch>
      </BrowserRouter>
    </Provider>
    );
}

export default App;
