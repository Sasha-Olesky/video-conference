var path = require('path');
var config = require('../config');
var kurento = require('kurento-client');
var Promise = require('es6-promise').Promise;

class KurentoWrapper {

    constructor() {
        this.kurentoClient = null;
        this.kurento = kurento;
    }

    /**
     * Gets kurento client instance
     *
     * @return {KurentoClient}
     */
    getKurentoClient() {
        return new Promise((resolve, reject) => {
            if (this.kurentoClient !== null) {
                resolve(this.kurentoClient);
            }

            kurento(config.KURENTO_URL, (err, _kurentoClient) => {
                if (err) {
                    console.log(`Could not find media server at address ${config.KURENTO_URL}`);
                    var msg = `Could not find media server at address ${config.KURENTO_URL}
                          . Exiting with err ${err}`;
                    return reject(msg)
                }

                this.kurentoClient = _kurentoClient;
                resolve(_kurentoClient);
            });
        });

    }

    /**
     * Creates WebRTCEndpoint
     * @param {MediaPipeline} pipeline
     * @return {Promise<WebRTCEndpoint>}
     */
    createWebRtcEndpoint(pipeline) {
        return new Promise((resolve, reject) => {
            pipeline.create('WebRtcEndpoint', (err, webRtcEndpoint) => {
                if (err) {
                    return reject({
                        err: err,
                        pipeline: pipeline
                    });
                }
                return resolve(webRtcEndpoint);
            });
        });

    }

    /**
     * Connects two kurento elements
     * @param firstElement
     * @param secondElement
     * @return {*}
     */
    connectMediaElements(firstElement, secondElement) {
        return new Promise((resolve, reject) => {
            firstElement.connect(secondElement, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(null);
            });
        });
    }

    /**
     * Creates MediaPipeline
     * @param kurentoClient
     * @return {Promise<MediaPipeline>}
     */
    createPipeline(kurentoClient) {
        return new Promise((resolve, reject)=> {
            kurentoClient.create('MediaPipeline', (err, pipeline) => {
                if (err) {
                    return reject(err);
                }
                resolve(pipeline);
            });
        });

    }

    /**
     * Creates RecorderEndpoint with provided options and connects it to
     * provided WebRTCEndpoint
     *
     * @param {MediaPipeline} pipeline
     * @param {WebRtcEndpoint} webRtcEndpoint
     * @param {object}options
     * @return {Promise<RecorderEndpoint>}
     */
    createRecorderEndpoint(pipeline, webRtcEndpoint, options = {}) {
        return new Promise((resolve, reject)=>{
            pipeline.create('RecorderEndpoint', options, (err, recorderEndpoint) => {
                if(err){
                    let msg = `Error during creating of RecorderEndpoint. ${JSON.stringify(err)}`;
                    console.log(msg);
                    return reject(msg);
                }
                webRtcEndpoint.connect(recorderEndpoint, (err) => {
                    if(err){
                        let msg = `Error during connecting of RecorderEndpoint and WebRtcEndpoint. ${JSON.stringify(err)}`;
                        console.log(msg);
                        return reject(msg);
                    }
                    resolve(recorderEndpoint);
                });
            });
        })
    }
}

module.exports = new KurentoWrapper();