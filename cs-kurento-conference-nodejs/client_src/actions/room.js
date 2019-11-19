import {
    ROOM_IS_LOADED,
    SET_CURRENT_USER_ID,
    SET_ROOM_NAME
} from '../constants/room';

export function roomLoaded() {
    return {
        type: ROOM_IS_LOADED
    }
}

export function setCurrentUserId(userId) {
    return {
        type: SET_CURRENT_USER_ID,
        payload: userId
    }
}

export function setRoomName(roomName) {
    return {
        type: SET_ROOM_NAME,
        payload: roomName
    }
}
