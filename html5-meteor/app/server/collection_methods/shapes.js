Meteor.methods({
    /**
     * Sends to server message about crating, updating, and finish of drawing of the shape or text
     *
     * @param {Object} annotation - information about shape or text
     * @param {('triangle'|'rectangle'|'ellipse'|'line'|'pencil'|'text')} annotation.type - type of the shape or text
     * @param {('DRAW_START'|'DRAW_UPDATE'|'DRAW_END'|'textCreated'|'textEdited'|'textPublished')} annotation.status - drawing status of the shape or text
     * @param {Array} annotation.points - array of points([x1,y1,x2,y2...] in percents) that represent shape
     * @param {string} annotation.color - color of the shape in decimal
     * @param {string} annotation.thickness - thickness of the shape
     * @param {'false'} annotation.transparency - useless but required parameter
     * @param {string} annotation.whiteboardId - id of current whiteboard
     * @param {string} annotation.id - id of the shape
     * @param {string} annotation.calcedFontSize - font size in percents
     * @param {string} annotation.dataPoints - position of textbox in "x,y" string format
     * @param {string} annotation.fontColor - font color in decimal
     * @param {string} annotation.fontSize - font size in pixels
     * @param {string} annotation.text - text content
     * @param {string} annotation.textBoxHeight - height of text box in percents
     * @param {string} annotation.textBoxWidth - width of text box in percents
     * @param {string} annotation.y - y position of text box in percents
     * @param {string} annotation.x - x position of text box in percents
     * @param {string} meetingId - id of current meeting
     * @param {string} userId - id of current user
     * @param {string} authToken - token for checking permissions
     */
    shareShapeMessage(annotation, meetingId, userId, authToken) {
        if(!isAllowedTo('whiteboardOperations', meetingId, userId, authToken)){
            return;
        }
        let message = {
            "payload": {
                "meeting_id": meetingId,
                "requester_id": userId,
                "annotation": annotation
            },
            "header": {
                "name": "send_whiteboard_annotation_request"
            }
        };
        return publish(Meteor.config.redis.channels.toBBBApps.whiteboard, message);
    },
    /**
     * Sends to server message to remove previous drawing on the provided whiteboard
     *
     * @param whiteboardId - id of current whiteboard
     * @param {string} meetingId - id of current meeting
     * @param {string} userId - id of current user
     * @param {string} authToken - token for checking permissions
     */
    undoShapeMessage(whiteboardId, meetingId, userId, authToken) {
        if(!isAllowedTo('whiteboardOperations', meetingId, userId, authToken)){
            return;
        }
        var shapes = Meteor.Shapes.find({whiteboardId: whiteboardId}, {sort: {date_created: -1}}).fetch();
        var lastShape = shapes[shapes.length - 1];
        if(!lastShape){
            return;
        }
        let message = {
            "payload": {
                "meeting_id": meetingId,
                "requester_id": userId,
                "shape_id": lastShape.shape.id,
                "whiteboard_id": whiteboardId
            },
            "header": {
                "name": "undo_whiteboard_request"
            }
        };
        return publish(Meteor.config.redis.channels.toBBBApps.whiteboard, message);
    },

    /**
     * Sends to server message to remove all drawings on the provided whiteboard
     *
     * @param whiteboardId - id of current whiteboard
     * @param {string} meetingId - id of current meeting
     * @param {string} userId - id of current user
     * @param {string} authToken - token for checking permissions
     */
    cleanWhiteboardMessage(whiteboardId, meetingId, userId, authToken) {
        if(!isAllowedTo('whiteboardOperations', meetingId, userId, authToken)){
            return;
        }
        let message = {
            "payload": {
                "meeting_id": meetingId,
                "requester_id": userId,
                "whiteboard_id": whiteboardId
            },
            "header": {
                "name": "clear_whiteboard_request"
            }
        };
        return publish(Meteor.config.redis.channels.toBBBApps.whiteboard, message);
    },

    /**
     * Sends to server message to zoom and move zoomed section of provided whiteboard
     *
     * @param xOffset - x offset in percents of current zoomed section
     * @param yOffset - y offset in percents of current zoomed section
     * @param heightRatio - height in percents of current zoomed section
     * @param widthRatio - width in percents of current zoomed section
     * @param {string} meetingId - id of current meeting
     * @param {string} userId - id of current user
     * @param {string} authToken - token for checking permissions
     */
    resizeAndMoveSlideMessage(xOffset, yOffset, heightRatio, widthRatio, meetingId, userId, authToken) {
        if(!isAllowedTo('whiteboardOperations', meetingId, userId, authToken)){
            return;
        }
        let message = {
            "payload": {
                "meeting_id": meetingId,
                "x_offset":xOffset,
                "y_offset":yOffset,
                "height_ratio":heightRatio,
                "width_ratio": widthRatio,
            },
            "header": {
                "name": "resize_and_move_slide"
            }
        };
        return publish(Meteor.config.redis.channels.toBBBApps.presentation, message);
    }
});
// --------------------------------------------------------------------------------------------
// Private methods on server
// --------------------------------------------------------------------------------------------
this.addShapeToCollection = function(meetingId, whiteboardId, shapeObject) {
    let entry, id, removeTempTextShape;
    if(shapeObject != null && shapeObject.shape_type === "text") {
        Meteor.log.info(`we are dealing with a text shape and the event is:${shapeObject.status}`);
        entry = {
            meetingId: meetingId,
            whiteboardId: whiteboardId,
            shape: {
                type: shapeObject.shape.type,
                textBoxHeight: shapeObject.shape.textBoxHeight,
                backgroundColor: shapeObject.shape.backgroundColor,
                fontColor: shapeObject.shape.fontColor,
                status: shapeObject.shape.status,
                dataPoints: shapeObject.shape.dataPoints,
                x: shapeObject.shape.x,
                textBoxWidth: shapeObject.shape.textBoxWidth,
                whiteboardId: shapeObject.shape.whiteboardId,
                fontSize: shapeObject.shape.fontSize,
                id: shapeObject.shape.id,
                y: shapeObject.shape.y,
                calcedFontSize: shapeObject.shape.calcedFontSize,
                text: shapeObject.shape.text,
                background: shapeObject.shape.background
            }
        };
        if(shapeObject.status === "textEdited" || shapeObject.status === "textPublished") {
            // only keep the final version of the text shape
            removeTempTextShape = function(callback) {
                Meteor.Shapes.remove({
                    'shape.id': shapeObject.shape.id
                });
                // for s in Meteor.Shapes.find({'shape.id':shapeObject.shape.id}).fetch()
                //   Meteor.log.info "there is this shape: #{s.shape.text}"
                return callback();
            };
            return removeTempTextShape(() => {
                    // display as the prestenter is typing
                    let id;
            id = Meteor.Shapes.insert(entry);
            return Meteor.log.info(`${shapeObject.status} substituting the temp shapes with the newer one`);
        });
        }
        // the mouse button was released - the drawing is complete
        // TODO: pencil messages currently don't send draw_end and are labeled all as DRAW_START
    } else if((shapeObject != null && shapeObject.status === "DRAW_START") || shapeObject.shape.type === "poll_result") {
        entry = {
            meetingId: meetingId,
            whiteboardId: whiteboardId,
            shape: {
                wb_id: shapeObject.wb_id,
                shape_type: shapeObject.shape_type,
                status: shapeObject.status,
                id: shapeObject.id,
                shape: {
                    type: shapeObject.shape.type,
                    status: shapeObject.shape.status,
                    points: shapeObject.shape.points,
                    whiteboardId: shapeObject.shape.whiteboardId,
                    id: shapeObject.shape.id,
                    square: shapeObject.shape.square,
                    transparency: shapeObject.shape.transparency,
                    thickness: shapeObject.shape.thickness * 1.4,
                    color: shapeObject.shape.color,
                    result: shapeObject.shape.result,
                    num_respondents: shapeObject.shape.num_respondents,
                    num_responders: shapeObject.shape.num_responders
                }
            }
        };
        id = Meteor.Shapes.insert(entry);
    } else if(shapeObject != null && shapeObject.status === "DRAW_END") {
        id = Meteor.Shapes.update({ 'shape.id': shapeObject.shape.id},{$set:{
            "shape.shape.points": shapeObject.shape.points
        }});

    } else if(shapeObject != null && shapeObject.status === "DRAW_UPDATE") {
        id = Meteor.Shapes.update({ 'shape.id': shapeObject.shape.id},{$set:{
            "shape.shape.points": shapeObject.shape.points
        }});
    }
};

this.removeAllShapesFromSlide = function(meetingId, whiteboardId) {
    Meteor.log.info(`removeAllShapesFromSlide__${whiteboardId}`);
    if((meetingId != null) && (whiteboardId != null) && (Meteor.Shapes.find({
            meetingId: meetingId,
            whiteboardId: whiteboardId
        }) != null)) {
        return Meteor.Shapes.remove({
                meetingId: meetingId,
                whiteboardId: whiteboardId
            }, () => {
                Meteor.log.info("clearing all shapes from slide");

        // After shapes are cleared, wait 1 second and set cleaning off
        return Meteor.setTimeout(() => {
                return Meteor.WhiteboardCleanStatus.update({
                    meetingId: meetingId
                }, {
                    $set: {
                        in_progress: false
                    }
                });
    }, 1000);
    });
    }
};

this.removeShapeFromSlide = function(meetingId, whiteboardId, shapeId) {
    let shapeToRemove;
    if(meetingId != null && whiteboardId != null && shapeId != null) {
        shapeToRemove = Meteor.Shapes.findOne({
            meetingId: meetingId,
            whiteboardId: whiteboardId,
            "shape.id": shapeId
        });
        if(shapeToRemove != null) {
            Meteor.Shapes.remove(shapeToRemove._id);
            Meteor.log.info(`----removed shape[${shapeId}] from ${whiteboardId}`);
            return Meteor.log.info(`remaining shapes on the slide: ${
                Meteor.Shapes.find({
                    meetingId: meetingId,
                    whiteboardId: whiteboardId
                }).count()}`);
        }
    }
};

// called on server start and meeting end
this.clearShapesCollection = function(meetingId) {
    if(meetingId != null) {
        return Meteor.Shapes.remove({
                meetingId: meetingId
            }, () => {
                Meteor.log.info(`cleared Shapes Collection (meetingId: ${meetingId}!`);
        return Meteor.WhiteboardCleanStatus.update({
            meetingId: meetingId
        }, {
            $set: {
                in_progress: false
            }
        });
    });
    } else {
        return Meteor.Shapes.remove({}, () => {
                Meteor.log.info("cleared Shapes Collection (all meetings)!");
        return Meteor.WhiteboardCleanStatus.update({
            meetingId: meetingId
        }, {
            $set: {
                in_progress: false
            }
        });
    });
    }
};

// --------------------------------------------------------------------------------------------
// end Private methods on server
// --------------------------------------------------------------------------------------------
