class SocketHelpers {
    /**
     * Returns data from session that needed for correct work of application
     *
     * @param {Socket} socket
     * @return {{userId, userName: string, roomName: string}}
     */
    getDataFromSession(socket) {
        let sessionId = socket.handshake.session.id;
        let userData = socket.handshake.session.userData || {};
        let userName = userData.userName || '';
        let roomName = userData.roomName || '';

        return {
            userId: sessionId,
            userName: userName,
            roomName: roomName
        }
    }

    /**
     * Returns custom data from session
     *
     * @param  {Socket} socket
     * @param {string} key - name of data field that was added via setValueToSession method
     * @return {*}
     */
    getValueFromSession(socket, key) {
        let sessionId = socket.handshake.session.id;
        let userData = socket.handshake.session.userData || {};
        var value = userData[key];

        return value;
    }

    /**
     * Sets custom dat to session
     *
     * @param {Socket} socket
     * @param {number} key - name of data field
     * @param {any} value - data that must be served in session
     * @return {object} - session user data
     */
    setValueToSession(socket, key, value){
        socket.handshake.session.userData = socket.handshake.session.userData || {};
        socket.handshake.session.userData[key] = value;
        socket.handshake.session.save();
        return socket.handshake.session.userData;
    }

    /**
     * Sends message to specific socket(user)
     *
     * @param io
     * @param {string} roomName
     * @param {object} message
     */
    sendMessageToRoom(io, roomName, message) {
        io.sockets.in(roomName).emit('message', message);
    }

    /**
     * Sends message to all sockets(users) in provided room
     *
     * @param socket
     * @param message
     */
    sendMessageToSocket(socket, message) {
        socket.emit("message", message);
    }

    /**
     * Checks for socket existence in room with provided name
     *
     * @param {object} io
     * @param {object} socket
     * @param {string} roomName
     * @return {boolean}
     */
    isSocketInTheRoom(io, socket, roomName){
        if( io.sockets.adapter.rooms[roomName] &&
            io.sockets.adapter.rooms[roomName].sockets &&
            io.sockets.adapter.rooms[roomName].sockets[socket.id]) {
            return true;
        }
        return false;
    }
}

module.exports = new SocketHelpers();