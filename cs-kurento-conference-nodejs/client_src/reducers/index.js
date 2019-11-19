import {combineReducers} from 'redux';
import room from './room';
import users from './users';

export default combineReducers({
    room:room,
    users:users
});