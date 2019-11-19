var Promise = require('es6-promise').Promise;
var kurentoWrapper = require('./KurentoWrapper');
var Logger = require('./Logger');

/**
 *  Class that provides operations with rooms
 */
class Room {

    constructor() {
        /**
         * Object that represents all rooms
         * @type {{object}}
         * @property {object} rooms[roomName] - object that represents room
         * @property {object} rooms[roomName].pipeline - MediaPipeline instance of room
         * @property {object} rooms[roomName].usersList - object that represents list of room users
         * @property {User} rooms[roomName].usersList[userId] - User class instance
         */
        this.rooms = {};
    }

    /**
     * Returns User from provided room
     *
     * @param {string} roomName - name of room from which user will be returned
     * @param {string|number} userId
     * @return {User|null}
     */
    getUserById(roomName, userId) {
        if (!this.isRoomExist(roomName)) {
            Logger.error(`Room(getUserById) Can't get user ${userId} in room ${roomName}. Room is not exist.`);
            return null;
        }
        return this.getRoom(roomName).usersList[userId]
    }

    /**
     * Adds user to specified room
     *
     * @param {string} roomName - name of room to which user will be added
     * @param {User} user - User class instance
     * @return {null}
     */
    register(roomName, user) {
        if (!this.isRoomExist(roomName)) {
            Logger.error(`Room(register) Can't register ${user.name} in room ${roomName}. Room is not exist.`);
            return null;
        }
        this.getRoom(roomName).usersList[user.id] = user;
    }

    /**
     * Returns users list from specified room. All users objects contains information that was provided
     * by User.getUserToSend() method.
     *
     * @param {string} roomName - name of room from which users list will be returned
     * @return {Array}
     */
    getUserListToSend(roomName) {
        if (!this.isRoomExist(roomName) || !this.getRoom(roomName).usersList) {
            return [];
        }
        var userList = [];
        var room = this.getRoom(roomName);
        for (var key in room.usersList) {
            var user = room.usersList[key];
            userList.push(user.getUserToSend());
        }
        return userList;
    }

    /**
     * Returns users list from specified room
     *
     * @param {string} roomName - name of room from which users list will be returned
     * @return {Array}
     */
    getUserList(roomName) {
        var userList = [];
        var room = this.getRoom(roomName);
        for (var key in room.usersList) {
            var user = room.usersList[key];
            userList.push(user);
        }
        return userList || [];
    }

    /**
     * Removes user from specified room.
     *
     * @param roomName - name of room from which User will be deleted
     * @param {User} user - User class instance
     * @return {null}
     */
    removeUser(roomName, user) {
        if (!this.isRoomExist(roomName)) {
            Logger.error(`Room(removeUser) Can't remove ${user.name} from room ${roomName}. Room is not exist.`);
            return null;
        }
        if (typeof user !== "object" || !user.id) {
            Logger.error(`Room(removeUser) Can't remove user from room ${roomName}. Provided user is not a object.`);
            return null;
        }
        if (this.getRoom(roomName).usersList[user.id]) {
            delete this.getRoom(roomName).usersList[user.id]
        } else {
            Logger.error(`Room(removeUser) Can't remove user ${user.name} from room ${roomName}. User doesn't exist in that room.`);
            return null;
        }
    }

    /**
     * If room doesn't exist, it creates new one with MediaPipeline instance
     *
     * @param {string} roomName - name of room from which must be created
     * @return {Promise}
     */
    createRoomIfNotExist(roomName) {
        var _this = this;
        return new Promise((resolve, reject)=> {
            if (this.isRoomExist(roomName) && this.getRoom(roomName).pipeline) {
                Logger.info(`Room(createRoomIfNotExist) Room ${roomName} already exists.`);
                return resolve(this.getRoom(roomName));
            }
            _this.rooms[roomName] = {};
            _this.rooms[roomName].usersList = {};
            kurentoWrapper.getKurentoClient()
                .then((kurentoClient)=> {
                    return kurentoWrapper.createPipeline(kurentoClient)
                }, (err)=> {
                    var msg = `Room(createRoomIfNotExist) Error during getting kurento instance in Room.getRoom() method 
                       ${JSON.stringify(err)}`;
                    Logger.error(msg);
                    reject(msg);
                })
                .then((pipeline)=> {
                    _this.getRoom(roomName).pipeline = pipeline;
                    resolve(_this.getRoom(roomName));
                }, (err)=> {
                    var msg = `Room(createRoomIfNotExist) Error during creating pipeline in Room.getRoom() method 
                       ${JSON.stringify(err)}`;
                    Logger.error(msg);
                    reject(msg);
                });
        })

    }

    /**
     * Checks for room existence
     *
     * @param {string} roomName
     * @return {boolean}
     */
    isRoomExist(roomName) {
        return !!this.getRoom(roomName);
    }

    /**
     * Checks for user existence in provided room
     *
     * @param {string} roomName
     * @param {string|number} userId
     * @return {boolean}
     */
    isUserExist(roomName, userId) {
        return !!this.getUserById(roomName, userId);
    };

    /**
     * Returns room object by name
     *
     * @param {string} roomName
     * @return {object|undefined}
     */
    getRoom(roomName) {
        return this.rooms[roomName];
    };
}

module.exports = new Room();
