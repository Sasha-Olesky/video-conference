import kurentoUtils from '../public/libs/kurento-utils/js/kurento-utils';

class Utils {
    static fullScreen(elem) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
    }

    static shareScreen(onStopSharing=()=>{}) {
        return new Promise((resolve, reject)=> {
            var screen = new Screen(new Date().getTime());

            screen.onaddstream = function (e) {
                if (!e.stream) {
                    return reject("Can't get desktop sharing stream");
                }
                e.stream.getVideoTracks()[0].onended = function () {
                    onStopSharing();
                };
                resolve(e.stream);
            };
            screen.check();

            screen.share();
        })
    }

    static sendLocalStream(options) {
        return new Promise((resolve, reject)=> {
            let webRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, (err) => {
                if (err) {
                    return reject(`Error during creating of webRtcPeer`, err);
                }
                console.log("Local participant sends video");
                webRtcPeer.generateOffer(function (err, sdpOffer) {
                    if (err) {
                        return reject("Error during sdpOffer generation for local video!", err);
                    }
                    resolve([webRtcPeer, sdpOffer]);
                });
            });
        });
    }

    static receiveRemoteStream(options) {
        return new Promise((resolve, reject) => {
            let webRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, (err) => {
                if (err) {
                    return reject(`Error during creating webRtcPeer receiver ${JSON.stringify(err)}`);
                }
                webRtcPeer.generateOffer(function (err, offerSdp) {
                    if (err) {
                        return reject("Error during sdpOffer generation for remote video", err);
                    }
                    resolve([webRtcPeer, offerSdp])
                });
            });
        });
    }

    static  getAudioStream() {
        return new Promise((resolve, reject) => {
            resolve();
            // navigator.getUserMedia({ audio: true, video: false },
            //     function(stream) {
            //         resolve(stream);
            //     },
            //     function() {
            //         resolve(null);
            //     }
            // );
        })
    }
}

export default Utils;