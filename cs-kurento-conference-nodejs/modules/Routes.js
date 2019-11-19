let Room = require("./Room");
let RedisWrapper = require('./RedisWrapper');
let process = require('process');
let Logger = require('./Logger');

module.exports = (app) => {
    app.get('/', (req, res) => {
        let session = req.session.userData ? req.session.userData : {};
        let userName = session.userName;
        let roomName = session.roomName;
        if (roomName && userName) {
            return res.redirect('/room');
        }
        res.render('index');
    });
    app.get('/iframe', (req, res) => {
        res.render('iframe');
    });
    app.get('/room', (req, res) => {
        let query = req.query;
        req.session.userData = req.session.userData || {};
        let session = req.session.userData;
        let userName = query.userName;
        let roomName = query.roomName;
        if (!userName || !roomName) {
            userName = session.userName;
            roomName = session.roomName;
        }
        if (!userName || !roomName) {
            return res.redirect('/');
        }
        session.userName = userName;
        session.roomName = roomName;
        res.render('room', {userName: userName, roomName: roomName, userId: req.sessionID});
    });
    app.get('/logout', (req, res)=> {
        req.session.destroy();
        res.redirect('/');
    });

    app.post("/toggle-recording", function (req, res) {
        var {userId, roomId, record} = req.body;
        Room.createRoomIfNotExist(roomId)
        .then(()=> {
            record = record == "true";
            var currentRoom = Room.getRoom(roomId);
            currentRoom.recording = record;

            RedisWrapper.pub.incr("global:nextRecordedMsgId", (err, id)=> {
                if (err) {
                    res.status(500).end();
                }
                let time = process.hrtime();
                let timestamp = time[0] + (new Date().getTime() + '').slice(-3);
                let key = `recording:${roomId}:${id}`;
                var eventData = {
                    payload: {
                        recording: record,
                        userid: userId,
                        meeting_id: roomId
                    },
                    header: {
                        timestamp: timestamp,
                        name: "set_recording_status_request_message",
                        version: "0.0.1"
                    }
                };
                RedisWrapper.publish("bigbluebutton:to-bbb-apps:users", eventData);
                Logger.info(`(POST /toggle-recording) publish event to redis channel bigbluebutton:to-bbb-apps:users
                             with data: ${JSON.stringify(eventData)}`);
                res.json({recording: record});
            });
        }, (err)=> {
            console.log(err);
            res.status(500).end();
        });
    });
    app.post("/recording-status", function (req, res) {
        var {roomId} = req.body;
        if (Room.isRoomExist(roomId)) {
            var currentRoom = Room.getRoom(roomId);
            res.json({recording: !!currentRoom.recording});
        } else {
            res.status(500).end();
        }
    });
};
