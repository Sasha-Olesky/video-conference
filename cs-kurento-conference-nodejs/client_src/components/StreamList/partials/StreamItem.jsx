import React from 'react';
import Utils from '../../../utils.jsx';

class StreamItem extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            broadcasting: this.props.broadcasting,
            video_src: null,
            muted: false
        };
        this.bindedSocketHandlers = this.socketHandlers.bind(this);
    }
    componentDidMount() {
        this.setState({
            mounted: true
        });
        this.initSocketHandlers();
        if(this.props.broadcasting){
            this.offerToReceiveVideo();
        }
    }
    componentWillUnmount(){
        this.setState({
            mounted: false
        });
        this.props.socket.removeListener("message", this.bindedSocketHandlers);
    }

    initSocketHandlers(){
        this.props.socket.on("message", this.bindedSocketHandlers);
    }
    socketHandlers(message){
        switch (message.id) {
            case 'iceCandidate':
                this.onRemoteICECandidate(message);
                break;
            case 'receiveVideoAnswer':
                this.receiveVideoAnswer(message);
                break;
            case "userBeginsBroadcasting":
                this.onUserBeginsBroadcasting(message);
                break;
            case 'userStopsBroadcasting':
                this.onUserStopsBroadcasting(message);
            default:
                break;
        }
    }
    offerToReceiveVideo() {
        var _this = this;

        var options = {
            audio: false,
            video: {
                mandatory: {
                    maxWidth: 320,
                    maxHeight: 180,
                    maxFrameRate: 60,
                    minFrameRate: 15
                }
            },
            onicecandidate: this.onLocalIceCandidate.bind(this)
        };
        Utils.receiveRemoteStream(options)
        .then(([webRtcPeer, offerSdp]) => {
            this.webRtcPeer = webRtcPeer;
            var msg = {
                id: "receiveRemoteVideo",
                remoteUserId: _this.props.userId,
                sdpOffer: offerSdp
            };
            _this.props.sendMessage(msg);
        }, (err) => {
            console.error(err);
        });
    }
    receiveVideoAnswer({userId, sdpAnswer}) {
        let _this = this;
        if(userId!==this.props.userId){
            return;
        }
        if(this.processingAnswer){
            return;
        }
        this.processingAnswer = true;
        if(!_this.state.mounted){
            return;
        }
        this.webRtcPeer.processAnswer(sdpAnswer, function (err) {
            _this.processingAnswer = false;
            if (err) {
                return console.error("Error during processAnswer", err);
            }
            console.info("A N S W E R  P R O C E S S E D ! ! !");
            let videoUrl = URL.createObjectURL(_this.webRtcPeer.peerConnection.getRemoteStreams()[0]);
            if(!_this.state.mounted){
                return;
            }
            _this.setState({
                broadcasting: false,
                video_src: videoUrl
            });
        })
    }
    onUserBeginsBroadcasting ({userId}) {
        if(userId!==this.props.userId){
            return;
        }
        console.log("User " + userId + " starts broadcasting. Attempt get his video.");
        this.offerToReceiveVideo();
    }
    onUserStopsBroadcasting ({userId}) {
        if(userId!==this.props.userId){
            return;
        }
        if(this.webRtcPeer){
            this.webRtcPeer.dispose();
        }
        if(!this.state.mounted){
            return;
        }
        this.setState ({
            broadcasting: false,
            video_src: null
        });
    }
    onLocalIceCandidate (candidate) {
        console.info("Local ICE candidate...");
        this.props.sendMessage({
            id: "onIceCandidateForIncomingStream",
            streamId: this.props.userId,
            candidate: candidate
        })
    }
    onRemoteICECandidate({userId, candidate}){
        if(userId!==this.props.userId){
            return;
        }
        console.info("Remote ICE candidate for " + userId);
        this.webRtcPeer.addIceCandidate(candidate, function (err) {
            if (err) {
                console.error("Error during adding ICE candidate to currentUser webRtcPeer", err);
            }
        });
    }
    fullScreen(){
        let videoId = `vid_${this.props.userId}`;
        let videoElement = document.getElementById(videoId);
        Utils.fullScreen(videoElement);
    }
    toggleMuted(){
        let currentMute = !this.state.muted;
        this.setState({
            muted: currentMute
        });
    }
    render () {
        let rootClassName = `c-stream-item ${!this.state.video_src ? "u-hide": ''} 
                             ${this.props.current ? 'c-stream-item--current': ''}`;
        return <div className={rootClassName} >
                    <div className="c-stream-item__header">
                        <p className="c-stream-item__name">
                            {this.props.userName}
                        </p>
                        <div className="c-stream-item__controls">
                            {/*{ !this.state.muted*/}
                            {/*&& <i title="Mute"*/}
                                  {/*className="c-stream-item__control c-stream-item__control--off fa fa-volume-up"*/}
                                  {/*onClick={this.toggleMuted.bind(this)}/>}*/}
                            {/*{ this.state.muted*/}
                            {/*&& <i title="Unmute"*/}
                                  {/*className="c-stream-item__control  fa fa-volume-off"*/}
                                  {/*onClick={this.toggleMuted.bind(this)}/>}*/}

                            <i title="Full screen"
                               onClick={this.fullScreen.bind(this)}
                               className="c-stream-item__control fa fa-arrows-alt" aria-hidden="true"/>
                        </div>
                    </div>
                    <div className="c-stream-item__body">
                            <video autoPlay
                                   controls={false}
                                   muted={true}
                                   id={`vid_${this.props.userId}`}
                                   className="c-stream-item__video"
                                   src={this.state.video_src} />
                    </div>
               </div>
    }
}

export default StreamItem;