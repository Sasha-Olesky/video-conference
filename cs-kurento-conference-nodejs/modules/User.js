let Room = require("./Room");
let SocketHelpers = require('./SocketHelpers');
let kurentoWrapper = require('./KurentoWrapper');
let kurento = kurentoWrapper.kurento;
let config = require('../config');
let path = require('path');
let Logger = require('./Logger');
let RedisWrapper = require('./RedisWrapper');
let process = require("process");
/**
 * Class that provides operations with specific user
 */
class User {
    static get desksharePrefix(){
        return 'deskshare_';
    }
    constructor({id, name, socket, roomName, io, isDeskshareSubuser = false}) {
        this.id = id;
        this.name = name;
        this.roomName = roomName;
        this.broadcasting = false;
        this.socket = socket;
        this.io = io;
        this.incomingStreams = {};
        this.outgoingStream = null;
        this.recorderEndpoint = null;
        this.ICECandidatesQueue = [];
        this.deskshareSubuser = null;
        this.isDeskshareSubuser = isDeskshareSubuser;
        this.logPrefix = `${this.isDeskshareSubuser?'[deskshare] ':''}`;

        if(!this.isDeskshareSubuser) {
            this.deskshareSubuser = new User({
                isDeskshareSubuser: true,
                id:  User.desksharePrefix+this.id,
                name: this.name,
                socket: this.socket,
                roomName: this.roomName,
                io: this.io
            });
        }
    }

    /**
     * Sends websocket message to current user
     *
     * @param {object} message
     */
    sendMessage(message) {
        SocketHelpers.sendMessageToSocket(this.socket, message);
    }

    /**
     * Sends websocket message to all users in current room
     *
     * @param {object} message
     */
    sendMessageToRoom(message) {
        SocketHelpers.sendMessageToRoom(this.io, this.roomName, message);
    }

    /**
     * Returns current users data for sending via websokets. Needs because
     * socket, io and other User instance properties are too large and have
     * reverse links to itself that cause errors.
     *
     * @return {{name, id, broadcasting: boolean, roomName: string}}
     */
    getUserToSend() {
        return {
            name: this.name,
            id: this.id,
            broadcasting: this.broadcasting,
            roomName: this.roomName,
            isDeskshareSubuser: this.isDeskshareSubuser
        }
    }

    /**
     * Registers current user in room and notify all users about new participant.
     * Also, notifies current user about success of join.
     */
    joinRoom() {
        return new  Promise((resolve, reject)=>{
            Logger.info(`${this.logPrefix}User(joinRoom) User "${this.name}" 
                      tries to join room "${this.roomName}". User id: ${this.id}`);
            let userToSend;
            Room.createRoomIfNotExist(this.roomName)
                .then(()=> {
                    Room.register(this.roomName, this);

                    if(this.isDeskshareSubuser){
                        userToSend = this.getUserToSend();
                        this.sendMessageToRoom({id: "userJoined", user: userToSend});
                        resolve();
                    }
                    if(!this.isDeskshareSubuser){
                        this.deskshareSubuser.joinRoom()
                        .then(()=>{
                            userToSend = this.getUserToSend();
                            var userList = Room.getUserListToSend(this.roomName);
                            this.sendMessageToRoom({id: "userJoined", user: userToSend});
                            this.sendMessage({id: "selfJoined", users:userList, currentUserId:this.id, roomName: this.roomName});
                        });
                    }
                }, (err = {})=> {
                    Logger.error(`${this.logPrefix}User(joinRoom) Error during creating of new room "${this.roomName}"
                             for user ${this.name} or getting existed one ${JSON.stringify(err)}`)
                })
        });
    }

    /**
     * Fires when user starts broadcasting of his recording.
     * It creates WebRTCEndpoint for current user.
     *
     * @return {Promise}
     */
    createOutgoingStream() {
        let user;
        return new Promise((resolve, reject)=> {
            let room = Room.getRoom(this.roomName);
            if (!room) {
                let msg = `${this.logPrefix}User(createOutgoingStream) Error, room ${this.roomName} is not exist. User "${this.name}"`;
                Logger.error(msg);
                return reject(msg);
            }
            user = Room.getUserById(this.roomName, this.id);
            if (!user) {
                let msg = `${this.logPrefix}User(createOutgoingStream) Error, user ${this.id} is not exist in room ${this.roomName}`;
                Logger.error(msg);
                return reject(msg);
            }
            var pipeline = room.pipeline;
            if (!pipeline) {
                let msg = `${this.logPrefix}User(createOutgoingStream) Error, pipeline in room ${this.roomName} is not exist. User ${this.name}`;
                Logger.error(msg);
                return reject(msg);
            }
            if (this.outgoingStream) {
                let msg = `${this.logPrefix}User(createOutgoingStream) Outgoing stream is already initialized for ${this.name} in room 
                            "${this.roomName}". Use this one.`;
                Logger.info(msg);
                return resolve(user.outgoingStream);
            }
            kurentoWrapper.createWebRtcEndpoint(pipeline)
                .then((webRtcEndpoint)=> {
                    Logger.info(`${this.logPrefix}User(createOutgoingStream) WebRTCEndpoint for outgoing media for ${this.name} created successfully
                                 in room "${this.roomName}".`);
                    this.outgoingStream = webRtcEndpoint;
                    resolve();
                })
                .catch((err = {})=> {
                    var msg = `${this.logPrefix}User(createOutgoingStream) Error occurred during creating of outgoing stream
                               for user ${this.name} in room "${this.roomName}". Error::${JSON.stringify(err)}`;
                    Logger.error(msg);
                    reject(msg)
                });
        });
    }

    /**
     * Fires when user starts broadcasting of his recording.
     * It begins ICE, SDP exchanging between current user and his WebRTCEndpoint.
     * Sends server SDPAnswer to client that creates media flow from client to server.
     * Now, other users can get access to recording of that user.
     *
     * @param sdpOffer
     */
    startBroadcast(sdpOffer) {
        Logger.info(`${this.logPrefix}User(startBroadcast) User ${this.name} tries to begin video broadcasting in room "${this.roomName}"`);
        this.createOutgoingStream()
            .then(()=> {
                return new Promise((resolve, reject) => {
                    let room = Room.getRoom(this.roomName);
                    if (!room) {
                        let msg = `${this.logPrefix}User(startBroadcast) Error, room ${this.roomName} is not exist. User ${this.name}`;
                        Logger.error(msg);
                        return reject(msg);
                    }
                    var pipeline = room.pipeline;
                    if (!pipeline) {
                        let msg = `${this.logPrefix}User(startBroadcast) Error, pipeline in room ${this.roomName} is not exist. User ${this.name}`;
                        Logger.error(msg);
                        return reject(msg);
                    }
                    var outgoingStream = this.outgoingStream;
                    if (!outgoingStream) {
                        let msg = `${this.logPrefix}User(startBroadcast) Error, user ${this.name} doesn't have outgoingStream in room
                                   ${this.roomName} to start video broadcasting.`;
                        Logger.error(msg);
                        return reject(msg);
                    }

                    var userICECandidates = this.ICECandidatesQueue;

                    Logger.info(`${this.logPrefix}User(startBroadcast) Begin of adding user ICE candidates to outgoing stream
                                 of user ${this.name} in room "${this.roomName}"`);
                    while (userICECandidates.length) {
                        Logger.info(`${this.logPrefix}User(startBroadcast) Add ICE candidate of ${this.name} to his outgoing stream
                                     in room "${this.roomName}"`);
                        var candidate = userICECandidates.shift();
                        outgoingStream.addIceCandidate(candidate);
                    }

                    Logger.info(`${this.logPrefix}User(startBroadcast) Initializing of outgoing stream ICE candidates generation for
                                 user ${this.name} in room "${this.roomName}"`);
                    outgoingStream.on('OnIceCandidate', (event) => {
                        var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                        Logger.info(`${this.logPrefix}User(startBroadcast) Send generated ICE client from outgoing stream for user ${this.name}
                                     in room ${this.roomName}`);
                        this.sendMessage({
                            id: 'iceCandidateForOutgoing',
                            isDeskshareSubuser: this.isDeskshareSubuser,
                            candidate: candidate
                        });
                    });

                    Logger.info(`${this.logPrefix}(startBroadcast) Begin processing of sdpOffer of user ${this.name}
                                 in room "${this.roomName}" by his outgoing stream`);
                    outgoingStream.processOffer(sdpOffer, (err, sdpAnswer) => {
                        if (err) {
                            let msg = `${this.logPrefix}User(startBroadcast) Error during processing of ${this.name} sdpOffer 
                                       in room "${this.roomName}" by outgoing stream. ${JSON.stringify(err)}`;
                            Logger.error(msg);
                        }
                        Logger.info(`${this.logPrefix}User(startBroadcast) SDPAnswer generated successfully to user ${this.name} in
                                     room "${this.roomName}" by his outgoing stream`);

                        this.sendMessage({
                            id: "startBroadcastAnswer",
                            sdpAnswer: sdpAnswer,
                            isDeskshareSubuser: this.isDeskshareSubuser
                        });

                        outgoingStream.gatherCandidates((err)=> {
                            if (err) {
                                Logger.error(`${this.logPrefix}User(startBroadcast) Error during gathering user's ${this.name} outgoing stream
                                              in room "${this.roomName}"`);
                            }
                        });
                        this.assignStreamId();
                        var recorderOptions = this.getRecorderOptions();
                        kurentoWrapper.createRecorderEndpoint(pipeline, outgoingStream, recorderOptions)
                        .then((recorderEndpoint) => {
                            this.recorderEndpoint = recorderEndpoint;
                            recorderEndpoint.record();
                            this.publishStartRecordMessage();
                        })
                    });
                });
            });
    }
    assignStreamId(){
        this.streamId = this.id+'-'+new Date().getTime();
    }
    publishStartRecordMessage(){
        if(this.recorderStrted){
            Logger.info(`${this.logPrefix} User(publishStartRecordMessage) User ${this.name}(${this.id})
                    tries to send start record message but recording is already started`);
            return;
        }
        this.recorderStrted = true;
        let time = process.hrtime();
        let timestamp = time[0]+(new Date().getTime()+'').slice(-3);
        this.startTime = timestamp;
        let data = {
            payload: {
                stream:this.streamId,
                userid:this.id.replace(User.desksharePrefix,''),
                meeting_id:this.roomName
            },
            header: {
                timestamp:timestamp,
                name:"user_share_webcam_request_message",
                version:"0.0.1"
            }
        };
        RedisWrapper.publish("bigbluebutton:to-bbb-apps:users", data);
        Logger.info(`${this.logPrefix} User(publishStartRecordMessage) User ${this.name}(${this.id})
                     sends to redis message about start of record. Data: ${JSON.stringify(data)}`)

        data = {
            payload: {
                stream:this.streamId,
                userid:this.id.replace(User.desksharePrefix,''),
                recorded: false,
                meeting_id:this.roomName
            },
            header: {
                timestamp:timestamp,
                name: "user_shared_webcam_message",
                current_time:timestamp,
                version:"0.0.1"
            }
        };

        RedisWrapper.publish("bigbluebutton:to-bbb-apps:users", data);
        Logger.info(`${this.logPrefix} User(publishStartRecordMessage) User ${this.name}(${this.id})
                     sends to redis message about start of record. Data: ${JSON.stringify(data)}`);
        RedisWrapper.pub.incr("global:nextRecordedMsgId",(err, id)=>{
            if(err){
                Logger.error(`${this.logPrefix} User(publishStartRecordMessage) User ${this.name}(${this.id}).
                              Error during getting unique key: ${JSON.stringify(err)}`);
            }
            let key = `recording:${this.roomName}:${id}`;
            RedisWrapper.pub.hmset(key,
                "eventName","StartWebcamShareEvent",
                "stream", this.streamId,
                "meetingId", this.roomName,
                "module", "WEBCAM",
                "timestamp", timestamp);
            RedisWrapper.pub.expire(key, 1209600);
            Logger.info(`${this.logPrefix} User(publishStartRecordMessage) User ${this.name}(${this.id})
                     do hmset to redis with key ${key}.`);
            key = `meeting:${this.roomName}:recordings`;
            RedisWrapper.pub.rpush(key, id);
            RedisWrapper.pub.expire(key, 1209600);
        });

    }

    publishStopRecordMessage(){
        if(!this.recorderStrted){
            Logger.info(`${this.logPrefix} User(publishStartRecordMessage) User ${this.name}(${this.id})
                    tries to send stop record message but recording is already stoped`);
            return;
        }
        this.recorderStrted = false;
        let time = process.hrtime();
        let timestamp = time[0]+(new Date().getTime()+'').slice(-3);
        let data = {
            payload:{
                stream:this.streamId,
                userid:this.id.replace(User.desksharePrefix,''),
                meeting_id:this.roomName
            },
            header:{
                timestamp:timestamp,
                name:"user_unshare_webcam_request_message",
                version:"0.0.1"
            }
        };
        RedisWrapper.publish("bigbluebutton:to-bbb-apps:users", data);
        Logger.info(`${this.logPrefix} User(publishStopRecordMessage) User ${this.name}(${this.id})
                     sends to redis message about stop of record. Data: ${JSON.stringify(data)}`);
        data = {
            payload:{
                stream: this.streamId,
                userid:this.id.replace(User.desksharePrefix,''),
                recorded:false,
                meeting_id:this.roomName
            },
            header:{
                timestamp:timestamp,
                name:"user_unshared_webcam_message",
                current_time:timestamp,
                version:"0.0.1"
            }
        };

        RedisWrapper.publish("bigbluebutton:to-bbb-apps:users", data);
        Logger.info(`${this.logPrefix} User(publishStopRecordMessage) User ${this.name}(${this.id})
                     sends to redis message about stop of record. Data: ${JSON.stringify(data)}`);
        RedisWrapper.pub.incr("global:nextRecordedMsgId", (err, id)=>{
            if(err){
                Logger.error(`${this.logPrefix} User(publishStopRecordMessage) User ${this.name}(${this.id}).
                              Error during getting unique key: ${JSON.stringify(err)}`);
            }
            let key = `recording:${this.roomName}:${id}`;
            RedisWrapper.pub.hmset(key,
                "duration", Math.ceil((timestamp - this.startTime)/1000),
                "eventName", "StopWebcamShareEvent",
                "timestamp", timestamp,
                "stream", this.streamId,
                "meetingId", this.roomName,
                "module", "WEBCAM");
            RedisWrapper.pub.expire(key, 1209600);
            Logger.info(`${this.logPrefix} User(publishStopRecordMessage) User ${this.name}(${this.id})
                     do hmset to redis with key ${key}.`);

            key = `meeting:${this.roomName}:recordings`;
            RedisWrapper.pub.rpush(key, id);
            RedisWrapper.pub.expire(key, 1209600);
        });

    }

    /**
     * Adds ICECandidate sent by current user to his outgoing stream or for some incoming stream
     *
     * @param _candidate - ICECandidate
     */
    onIceCandidateForOutgoingStream(_candidate) {
        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
        if (this.outgoingStream) {
            Logger.info(`${this.logPrefix}User(onIceCandidate) Add ICE to outgoingStream of user ${this.name} 
                             in room "${this.roomName}"`);
            this.outgoingStream.addIceCandidate(candidate);
        } else {
            Logger.info(`${this.logPrefix}User(onIceCandidate) Add to ICECandidatesQueue of user ${this.name}
                             in room "${this.roomName}"`);
            this.ICECandidatesQueue.push(candidate);
        }

    }
    onIceCandidateForIncomingStream(streamId, _candidate){
        var candidate = kurento.getComplexType('IceCandidate')(_candidate);
        if (this.incomingStreams[streamId]) {
            Logger.info(`${this.logPrefix}User(onIceCandidate) Add ICE to incomingStream with id ${streamId} of
                            user ${this.name} in room "${this.roomName}"`);
            this.incomingStreams[streamId].addIceCandidate(candidate);
        } else {
            Logger.info(`${this.logPrefix}User(onIceCandidate) Add to ICECandidatesQueue of user ${this.name}
                             in room "${this.roomName}"`);
            this.ICECandidatesQueue.push(candidate);
        }
    }

    /**
     * Creates new WebRtcEndpoint for current user and adds it to his incoming streams object.
     * That incoming streams connects to other user WebRtcEndpoint for getting his video stream.
     * Begins ICE and SDP exchange between current user and his incoming stream that cause media flow
     * from other user WebRtcEndpoint to current user client side.
     *
     * @param {string} remoteUserId
     * @param sdpOffer
     * @return {*}
     */
    receiveRemoteVideo({remoteUserId, sdpOffer}) {
        let room = Room.getRoom(this.roomName);
        if (!room) {
            let msg = `${this.logPrefix}User(receiveRemoteVideo) Room "${this.roomName}" doesn't exist. User ${this.name}`;
            return Logger.error(msg);
        }

        let pipeline = room.pipeline;
        if (!pipeline) {
            let msg = `${this.logPrefix}User(receiveRemoteVideo) Room "${this.roomName}" doesn't have pipeline. User ${this.name}`;
            return Logger.error(msg);
        }

        let currentUser = Room.getUserById(this.roomName, this.id);
        if (!currentUser) {
            let msg = `${this.logPrefix}User(receiveRemoteVideo) User with id ${this.id}(${this.name}) doesn't exist in room ${this.roomName}`;
            return Logger.error(msg);
        }

        let remoteUser = Room.getUserById(this.roomName, remoteUserId);
        if (!remoteUser) {
            let msg = `${this.logPrefix}User(receiveRemoteVideo) Remote user with id ${this.id} doesn't exist in room ${this.roomName}.
                       User ${this.name}`;
            return Logger.error(msg);
        }

        let remoteUserOutgoingStream = remoteUser.outgoingStream;
        if (!remoteUserOutgoingStream) {
            let msg = `${this.logPrefix}User(receiveRemoteVideo) Remote user ${remoteUser.name} doesn't have outgoing stream.
                       User ${this.name}`;
            return Logger.error(msg);
        }

        let incomingStream;

        kurentoWrapper.createWebRtcEndpoint(pipeline)
            .then((webRtcEndpoint)=> {
                incomingStream = webRtcEndpoint;
                this.incomingStreams[remoteUserId] = incomingStream;

                Logger.info(`${this.logPrefix}User(receiveRemoteVideo) Begin of adding user ICE candidates to incoming stream
                             with id:${remoteUserId}(${remoteUser.name}) of user ${this.name} in room "${this.roomName}"`);

                while (this.ICECandidatesQueue.length) {
                    Logger.info(`${this.logPrefix}User(receiveRemoteVideo) Add ICE candidate of ${this.name} to his incoming stream
                                with id:${remoteUserId}(${remoteUser.name}) in room  "${this.roomName}"`);
                    var candidate = this.ICECandidatesQueue.shift();
                    incomingStream.addIceCandidate(candidate);
                }

                Logger.info(`${this.logPrefix}User(receiveRemoteVideo) Initializing of incoming stream ICE candidates generation for
                             user ${this.name} incoming stream with id:${remoteUserId}(${remoteUser.name}) in room "${this.roomName}"`);
                incomingStream.on('OnIceCandidate', (event) => {
                    var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                    Logger.info(`${this.logPrefix}User(receiveRemoteVideo) Send generated ICE client from incoming stream
                                 with id:${remoteUserId}(${remoteUser.name}) for user ${this.name} in room  "${this.roomName}"`);
                    this.sendMessage({
                        id: 'iceCandidate',
                        candidate: candidate,
                        userId: remoteUserId
                    });
                });
                return kurentoWrapper.connectMediaElements(remoteUserOutgoingStream, incomingStream);
            })
            .then(()=> {
                incomingStream.processOffer(sdpOffer, (err, sdpAnswer) => {
                    if (err) {
                        Logger.error(`${this.logPrefix}User(receiveRemoteVideo) Error during processing sdp offer 
                                      of incoming stream with id:${remoteUserId}(${remoteUser.name}) to user
                                      ${this.name} in room "${this.roomName}". Err: ${JSON.stringify(err)}`);
                    }
                    Logger.info(`${this.logPrefix}User(receiveRemoteVideo) Success of processing sdpOffer from user
                                 ${this.name} incoming stream with id:${remoteUserId}(${remoteUser.name}) 
                                 in room "${this.roomName}". Sending sdpAnswer to ${this.name}`);
                    this.sendMessage({
                        id: "receiveVideoAnswer",
                        sdpAnswer: sdpAnswer,
                        userId: remoteUserId
                    });
                    incomingStream.gatherCandidates((error) => {
                        if (error) {
                            Logger.error(`${this.logPrefix}User(receiveRemoteVideo) Error during gathering of candidates 
                                          for incoming stream with id:${remoteUserId}(${remoteUser.name}) of user ${this.name}
                                          in room "${this.roomName}"${JSON.stringify(err)}`);
                        }
                    });

                });
            }, (err = {})=> {
                Logger.error(`${this.logPrefix}User(receiveRemoteVideo) Error during connection of user
                              ${this.name} incoming stream with id:${remoteUserId}(${remoteUser.name})
                              with outgoing stream of ${remoteUser.name}.${JSON.parse(err)}`);
            })

    }

    /**
     * Stops sharing video of current user. It releases current user's outgoing stream and
     * releases all incoming streams of other users that was connected to outgoing stream of current user.
     * Sends message to all users of current room about stop of video broadcasting of current user.
     */
    stopRecord() {
        this.broadcasting = false;
        Logger.info(`${this.logPrefix}User(stopRecord) User ${this.name} stops sharing video in room "${this.roomName}"`);
        if(this.outgoingStream) {
            Logger.info(`${this.logPrefix}User(stopRecord) Release user's ${this.name} outgoing stream 
                         in room "${this.roomName}"`);
            this.outgoingStream.release();
            this.outgoingStream = null;
        }
        if(this.recorderEndpoint){
            Logger.info(`${this.logPrefix}User(stopRecord) Stop and release user's ${this.name} recorder 
                         endpoint in room "${this.roomName}"`);
            this.recorderEndpoint.stop();
            this.recorderEndpoint.release();
            this.recorderEndpoint = null;
        }
        Logger.info(`${this.logPrefix}User(stopRecord) Begin removing associated with ${this.name} other 
                     users incoming streams in room "${this.roomName}"`);
        var userList = Room.getUserList(this.roomName);
        userList.forEach((remoteUser)=>{
            var relativeStream = remoteUser.incomingStreams[this.id];
            if(relativeStream) {
                Logger.info(`${this.logPrefix}User(stopRecord) Release incoming stream of 
                             user ${remoteUser.name} which associated
                             with user ${this.name} in room "${this.roomName}"`);
                relativeStream.release();
                delete remoteUser.incomingStreams[this.id];
                remoteUser.sendMessage({
                    id: "userStopsBroadcasting",
                    userId: this.id
                });
            }
        });

        this.publishStopRecordMessage();
    }

    /**
     * Fires when current user loses connection. Notifies all users in current room
     * about that event.
     */
    onDisconnect(){
        Logger.info(`User(onDisconnect) User ${this.name} disconnected from room ${this.roomName}`);
        this.stopRecord();
        this.sendMessageToRoom({
            id: "userLeaved",
            userId: this.id
        });
        Room.removeUser(this.roomName, this);
    }

    getRecorderOptions(){
        return {
            uri: 'file://' + path.join( config.RECORDINGS_PATH,
                                         this.roomName,
                                         this.streamId + config.RECORD_FORMAT),
            mediaProfile:'WEBM_VIDEO_ONLY'
        }
    }

}
module.exports = User;