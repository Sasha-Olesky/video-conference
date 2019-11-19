Meteor.methods({
  /**
   * Sends message to server for setting current position of whiteboard cursor
   *
   * @param x - x position of cursor in percents
   * @param y - y position of cursor in percents
   * @param {string} meetingId - id of current meeting
   * @param {string} userId - id of current user
   * @param {string} authToken - token for checking permissions
   */
  shareCursorPositionMessage(x, y, meetingId, userId, authToken) {
    if(!isAllowedTo('whiteboardOperations', meetingId, userId, authToken)){
      return;
    }
    let message = {
      "payload": {
        "meeting_id": meetingId,
        "x_percent": x,
        "y_percent": y
      },
      "header": {
        "name": "send_cursor_update"
      }
    };
    return publish(Meteor.config.redis.channels.toBBBApps.presentation, message);
  }
});
// --------------------------------------------------------------------------------------------
// Private methods on server
// --------------------------------------------------------------------------------------------
this.initializeCursor = function(meetingId) {
  return Meteor.Cursor.upsert({
    meetingId: meetingId
  }, {
    meetingId: meetingId,
    x: 0,
    y: 0
  }, (err, numChanged) => {
    if(err) {
      return Meteor.log.error(`err upserting cursor for ${meetingId}`);
    } else {
      // Meteor.log.info "ok upserting cursor for #{meetingId}"
    }
  });
};

this.updateCursorLocation = function(meetingId, cursorObject) {
  return Meteor.Cursor.update({
    meetingId: meetingId
  }, {
    $set: {
      x: cursorObject.x,
      y: cursorObject.y
    }
  }, (err, numChanged) => {
    if(err != null) {
      return Meteor.log.error(`_unsucc update of cursor for ${meetingId} ${JSON.stringify(cursorObject)} err=${JSON.stringify(err)}`);
    } else {
      // Meteor.log.info "updated cursor for #{meetingId} #{JSON.stringify cursorObject}"
    }
  });
};

// called on server start and meeting end
this.clearCursorCollection = function(meetingId) {
  if(meetingId != null) {
    return Meteor.Cursor.remove({
      meetingId: meetingId
    }, () => {
      return Meteor.log.info(`cleared Cursor Collection (meetingId: ${meetingId})!`);
    });
  } else {
    return Meteor.Cursor.remove({}, () => {
      return Meteor.log.info("cleared Cursor Collection (all meetings)!");
    });
  }
};

// --------------------------------------------------------------------------------------------
// end Private methods on server
// --------------------------------------------------------------------------------------------
