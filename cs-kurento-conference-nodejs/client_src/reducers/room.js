import {
    ROOM_IS_LOADED,
    SET_CURRENT_USER_ID,
    SET_ROOM_NAME
} from '../constants/room';

const initialState = {
    loaded: false
};

export default function room(state = initialState, action) {
    switch (action.type) {
        case ROOM_IS_LOADED:
            return {...state, loaded:true};
        case SET_CURRENT_USER_ID:
            return {...state, currentUserId:action.payload};
        case SET_ROOM_NAME:
            return {...state, roomName:action.payload};
        default:
            return state;
    }
}