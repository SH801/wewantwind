import { DESKTOP, MOBILE } from '../constants/actionTypes'

const mobileReducer = (state = false, action) => {
    switch(action.type) {
        case DESKTOP:
            return false;
        case MOBILE:
            return true;
        default: return state;
    }
}

export default mobileReducer;