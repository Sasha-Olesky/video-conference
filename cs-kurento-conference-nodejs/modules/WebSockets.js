var Room = require('./Room');
var User = require('./User');
var SocketHelpers = require('./SocketHelpers');
var Logger = require('./Logger');

module.exports = (io) => {
    io.on('connection', (socket) => {
	    Logger.error('url=======>' + socket.handshake.url);
        let currentUser = null;
        let {userId, userName, roomName} = SocketHelpers.getDataFromSession(socket);
        if(roomName){
                socket.join(roomName);
        }

        socket.on("disconnect", () => {
            if (!currentUser) {
                currentUser = Room.getUserById(roomName, userId);
            }
            if (!currentUser) {
                Logger.error(`WebSockets(disconnect) Error, disconnect from user that not exist`);
                return;
            }
            currentUser.onDisconnect();
            currentUser.deskshareSubuser.onDisconnect();
            socket.handshake.session.destroy();
        });

        socket.on('message', (message) => {
            if(!SocketHelpers.isSocketInTheRoom(io, socket, roomName)){
                Logger.info(`(WebSockets) User ${userName} have socket that wasn't joined the room 
                            ${roomName}. Join again.`);
                socket.join(roomName);
            } else {
                Logger.info(`(WebSockets) User ${userName} have socket that already joined the room 
                            ${roomName}.`);
            }
            switch (message.id) {
                case 'joinRoom':
                    userId =  message.userId || userId ;
                    userName = message.userName || userName ;
                    roomName =  message.roomName || roomName;
                    socket.join(roomName);

                    currentUser = new User({
                        id:  userId,
                        name: userName,
                        socket: socket,
                        roomName: roomName,
                        io: io
                    });
                    currentUser.joinRoom();
                    break;
                case 'getUserList':
                    var userList = Room.getUserListToSend(roomName);
                    SocketHelpers.sendMessageToSocket(socket, {id: "getUserListResponse", users: userList});
                    break;
                case "startBroadcast":
                    if (!currentUser) {
                        currentUser = Room.getUserById(roomName, userId);
                    }
                    if (!currentUser) {
                        Logger.error(`WebSockets(startBroadcast) Error, startBroadcast from user that not exist`);
                        return;
                    }
                    currentUser.startBroadcast(message.sdpOffer);
                    break;
                case "startDeskshareBroadcast":
                    if (!currentUser) {
                        currentUser = Room.getUserById(roomName, userId);
                    }
                    if (!currentUser) {
                        Logger.error(`WebSockets(startBroadcast) Error, startBroadcast from user that not exist`);
                        return;
                    }
                    currentUser.deskshareSubuser.startBroadcast(message.sdpOffer);
                    break;
                case 'onIceCandidateForOutgoingStream':
                    var user = Room.getUserById(roomName, message.userId);
                    if (!user) {
                        Logger.error(`WebSockets(onIceCandidate) Error, onIceCandidate from user that not exist`);
                        return;
                    }
                    user.onIceCandidateForOutgoingStream(message.candidate);
                    break;
                case 'onIceCandidateForIncomingStream':
                    if (!currentUser) {
                        currentUser = Room.getUserById(roomName, userId);
                    }
                    if (!currentUser) {
                        Logger.error(`WebSockets(onIceCandidate) Error, onIceCandidate from user that not exist`);
                        return;
                    }
                    currentUser.onIceCandidateForIncomingStream(message.streamId, message.candidate);
                    break;
                case 'userBeginsBroadcasting':
                    var user = Room.getUserById(roomName, message.userId);
                    user.broadcasting = true;
                    SocketHelpers.sendMessageToRoom(io, roomName, {
                        id: "userBeginsBroadcasting",
                        userId: message.userId
                    });
                    break;
                case 'receiveRemoteVideo':
                    if (!currentUser) {
                        currentUser = Room.getUserById(roomName, userId);
                    }
                    if (!currentUser) {
                        Logger.error(`WebSockets(receiveRemoteVideo) Error, receiveRemoteVideo from user that not exist`);
                        return;
                    }
                    currentUser.receiveRemoteVideo({
                        remoteUserId: message.remoteUserId,
                        sdpOffer: message.sdpOffer,
                    });
                    break;
                case 'stopRecord':
                    if (!currentUser) {
                        currentUser = Room.getUserById(roomName, userId);
                    }
                    if (!currentUser) {
                        Logger.error(`WebSockets(stopRecord) Error, stopRecord from user that not exist`);
                        return;
                    }
                    currentUser.stopRecord();
                    break;
                case "stopDeskshare":
                    if (!currentUser) {
                        currentUser = Room.getUserById(roomName, userId);
                    }
                    if (!currentUser) {
                        Logger.error(`WebSockets(stopDeskshare) Error, stopDeskshare from user that not exist`);
                        return;
                    }
                    currentUser.deskshareSubuser.stopRecord();
                    break;
                default:
                    socket.emit('message', {
                        id: 'error',
                        message: 'Invalid message ' + message
                    });
                    break;
            }
        });

    });
};
