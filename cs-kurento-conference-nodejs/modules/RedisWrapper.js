class RedisWrapper {
    constructor(){
        this.redis = require('redis');
        this.pub = this.redis.createClient();
        this.sub = this.redis.createClient();
    }

    /**
     * Publishes message to specified redis channel
     *
     * @param {string} channel
     * @param {string|object} data
     */
    publish(channel, data){
        if(typeof data !== 'string'){
            if(typeof data === 'object'){
                data = JSON.stringify(data);
            }
            else {
                throw new Error("Only objects and strings allowed for publishing into redis");
            }
        }
        if(typeof channel !== "string"){
            throw new Error("Channel name must be provided and be a string");
        }
        this.pub.publish(channel, data);
    }
}

module.exports = new RedisWrapper();