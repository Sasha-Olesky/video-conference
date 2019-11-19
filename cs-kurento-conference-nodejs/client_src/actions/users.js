import {
    SET_USERS,
    ADD_USER,
    REMOVE_USER,
    UPDATE_USER
} from '../constants/users'

export function setUsers(users) {
    return {
        type: SET_USERS,
        payload: users
    }
}
export function addUser(user) {
    return {
        type: ADD_USER,
        payload: user
    }
}

export function removeUser(userId) {
    return {
        type: REMOVE_USER,
        payload: userId
    }
}

export function updateUser({userId, key, value}) {
    return {
        type: UPDATE_USER,
        payload: {userId, key, value}
    }
}