import React from 'react';
import {connect} from 'react-redux';
import { bindActionCreators } from 'redux'
require('../styles/main.scss');
import io from '../../node_modules/socket.io-client/lib'
import Header from '../components/Header/Header.jsx'
import UserList from '../components/UserList/UserList.jsx'
import StreamList from '../components/StreamList/StreamList.jsx'
import Loader from '../components/Loader/Loader.jsx'
import Utils from '../utils.jsx';

import {
    setUsers,
    addUser,
    removeUser,
    updateUser,
} from '../actions/users';

import {
    roomLoaded,
    setCurrentUserId,
    setRoomName
} from '../actions/room';


class App extends React.Component {
    constructor(props){
        super(props);
        this.socket = io.connect(window.CONFERENCE_SERVER_URL || '');

        window.startBroadcast = () => {
            this.startBroadcast();
        };
        window.startDeskshareBroadcast = () =>  {
            this.startDeskshareBroadcast();
        };
        window.stopBroadcast = () =>  {
            this.stopBroadcast();
        };
        window.stopDeskshare = () =>  {
            this.stopDeskshare();
        };
    }
    componentDidMount() {
        this.initSocketHandlers();
        var message = {
            id: "joinRoom",
        };
        this.sendMessage(message);

    }
    sendMessage(message={}) {
        if(!message.userId && window.userId){
            message.userId = window.userId;
        }
        if(!message.userName && window.userName) {
            message.userName = window.userName;
        }
        if(!message.roomName && window.roomName) {
            message.roomName = window.roomName;
        }
        this.socket.emit("message", message);
    }
    initSocketHandlers() {
        this.socket.on("message",(message) => {
            switch (message.id) {
                case 'selfJoined':
                    this.onSelfJoined(message);
                    break;
                case 'userJoined':
                    this.onNewUser(message);
                    break;
                case 'userLeaved':
                    this.onUserLeaved(message);
                    break;
                case 'iceCandidateForOutgoing':
                    if(message.isDeskshareSubuser){
                        this.deskshareWebRtcPeer.addIceCandidate(message.candidate);
                    } else {
                        this.webRtcPeer.addIceCandidate(message.candidate);
                    }
                    break;
                case 'startBroadcastAnswer':
                    this.onStartBroadcastAnswer(message);
                    break;
            }
        });
    }
    onSelfJoined({users=[], currentUserId='', roomName=''}) {
        this.props.setCurrentUserId(currentUserId);
        this.props.setRoomName(roomName);
        this.props.roomLoaded();
        this.props.setUsers(users);
    }
    onNewUser({user}) {
        this.props.addUser(user);
    }
    onUserLeaved({userId}){
        this.props.removeUser(userId);
    }
    updateUser({updateUserId, key, value}){
        this.props.updateUser({userId:updateUserId, key, value});
    }
    startDeskshareBroadcast(){
        let videoStream = null;
        Utils.shareScreen(this.stopDeskshare.bind(this))
        .then((videoStr)=>{
            videoStream = videoStr;
            return Utils.getAudioStream();
        },(err)=>{
            console.error(err);
        })
        .then(()=>{
            let options = {
                // audioStream: audioStream,
                videoStream: videoStream,
                onicecandidate: function (candidate) {
                    this.sendMessage({f
                        id: "onIceCandidateForOutgoingStream",
                        userId: 'deskshare_'+this.props.room.currentUserId,
                        candidate: candidate
                    });
                }.bind(this)
            };

            return Utils.sendLocalStream(options);
        })
        .then(([webRtcPeer, sdpOffer])=>{
            this.deskshareWebRtcPeer = webRtcPeer;
            this.sendMessage({id: "startDeskshareBroadcast", sdpOffer: sdpOffer});
        },(err)=>{
            console.error(err);
        })
    }
    startBroadcast(){
        let _this = this;
        let options = {
            audio:false,
            video: {
                mandatory: {
                    maxWidth: 320,
                    maxHeight: 180,
                    maxFrameRate: 60,
                    minFrameRate: 15
                }
            },
            onicecandidate: function (candidate) {
                this.sendMessage({
                    id: "onIceCandidateForOutgoingStream",
                    userId: this.props.room.currentUserId,
                    candidate: candidate
                });
            }.bind(this)
        };
        Utils.sendLocalStream(options)
        .then(([webRtcPeer, sdpOffer])=>{
            this.webRtcPeer = webRtcPeer;
            this.sendMessage({id: "startBroadcast", sdpOffer: sdpOffer});
        },(err)=>{
            console.error(err);
        });
    }
    stopDeskshare(){
        this.deskshareWebRtcPeer.dispose();
        this.updateUser({
            updateUserId: this.props.room.currentUserId,
            key: "desksharing",
            value: false
        });
        this.sendMessage({
            id: "stopDeskshare"
        });
    }
    stopBroadcast(){
        this.webRtcPeer.dispose();
        this.updateUser({
            updateUserId: this.props.room.currentUserId,
            key: "broadcasting",
            value: false
        });
        this.sendMessage({
            id: "stopRecord"
        });
    }
    onStartBroadcastAnswer ({sdpAnswer, isDeskshareSubuser = false}) {
        var _this = this;
        console.info("startBroadcastAnswer received!");
        let peer = isDeskshareSubuser ? this.deskshareWebRtcPeer : this.webRtcPeer;
        peer.processAnswer(sdpAnswer, function (err) {
            if (err) {
                return console.error("Error during startBroadcastAnswer", err);
            }
            if(isDeskshareSubuser){
                console.info('sdpAnswer for deskshare processed!!');
                _this.sendMessage({
                    id: 'userBeginsBroadcasting',
                    userId: 'deskshare_'+_this.props.room.currentUserId
                });
                _this.updateUser({
                    updateUserId: _this.props.room.currentUserId,
                    key: "desksharing",
                    value: true
                });
            } else {
                console.info('sdpAnswer for webcam processed!!');
                _this.sendMessage({
                    id: 'userBeginsBroadcasting',
                    userId: _this.props.room.currentUserId
                });
                _this.updateUser({
                    updateUserId: _this.props.room.currentUserId,
                    key: "broadcasting",
                    value: true
                });
            }
        });
    }

    render() {
        var userList = this.props.users.map((user)=>{
            user.current = (user.id.replace('deskshare_','') === this.props.room.currentUserId);
            return user;
        });
        if(this.props.room.loaded){
            return  <div className="kurento-conference">
                        <Header conferenceName={this.props.room.roomName}/>
                        <UserList   users={userList}
                                    startBroadcast={this.startBroadcast.bind(this)}
                                    startDeskshareBroadcast={this.startDeskshareBroadcast.bind(this)}
                                    stopBroadcast={this.stopBroadcast.bind(this)}
                                    stopDeskshare={this.stopDeskshare.bind(this)}/>

                        <StreamList users={userList}
                                    sendMessage={this.sendMessage.bind(this)}
                                    socket={this.socket}/>
                    </div>
        } else {
            return <Loader/>
        }

    }
}

function mapStateToProps( state ) {
    return {
        users: state.users,
        room: state.room
    }
}

function mapActionsToProps(dispatch) {
    return {
        setUsers: bindActionCreators(setUsers, dispatch),
        addUser: bindActionCreators(addUser, dispatch),
        removeUser: bindActionCreators(removeUser, dispatch),
        updateUser: bindActionCreators(updateUser, dispatch),
        roomLoaded: bindActionCreators(roomLoaded, dispatch),
        setCurrentUserId: bindActionCreators(setCurrentUserId, dispatch),
        setRoomName: bindActionCreators(setRoomName, dispatch)
    }
}

export default connect(mapStateToProps, mapActionsToProps)(App);