import {
    SET_USERS,
    ADD_USER,
    REMOVE_USER,
    UPDATE_USER
} from '../constants/users'

const initialState = [];

export default function users(state = initialState, action) {
    switch (action.type) {
        case SET_USERS:
            return action.payload;
        case ADD_USER:
            let newUser = action.payload;
            if(!isUserExist(state, newUser)){
                return [...state, newUser];
            }
            return action.payload;
        case REMOVE_USER:
            var userId = action.payload;
            var indexInArray = getUserIndex(state, userId);
            if(indexInArray >= 0){
                return [...state.slice(0, indexInArray),
                    ...state.slice(indexInArray + 1)]
            }
            return state;
        case UPDATE_USER:
            let {userId, key, value} = action.payload;
            var indexInArray = getUserIndex(state, userId);
            if(indexInArray >= 0) {
                var user = state[indexInArray];
                var updatedUser = {...user, [key]: value};
                return [...state.slice(0, indexInArray),
                    updatedUser,
                    ...state.slice(indexInArray + 1)]
            }
            return state;
        default:
            return state;
    }
}

function isUserExist(state, newUser) {
    var exists = false;
    state.forEach((user)=>{
        if(user.id === newUser.id){
            exists = true;
        }
    });
    return exists;
}

function getUserIndex(state, userId) {
    var indexInArray = -1;
    state.forEach((user, index)=>{
        if(user.id === userId){
            indexInArray = index;
        }
    });
    return indexInArray;
}