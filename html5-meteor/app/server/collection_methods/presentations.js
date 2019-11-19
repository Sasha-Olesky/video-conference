Meteor.methods({
  /**
   * Sends to server message for showing another presentation on whiteboard
   *
   * @param {string} presentationId - id of presentation that must be shown
   * @param {string} meetingId - id of current meeting
   * @param {string} userId - id of current user
   * @param {string} authToken - token for checking permissions
   */
  publishShowPresentationMessage(presentationId, meetingId, authToken, userId ) {
    if(!isAllowedTo('sharePresentation', meetingId, userId, authToken)){
        return;
    }
    let message = {
      "payload": {
        "presentation_id": presentationId,
        "share": true,
        "meeting_id": meetingId
      },
      "header": {
        "name": "share_presentation"
      }
    };
    return publish(Meteor.config.redis.channels.toBBBApps.presentation, message);
  },
  /**
   * Sends to server message for deleting presentation
   *
   * @param {string} presentationId - id of presentation that must be deleted
   * @param {string} meetingId - id of current meeting
   * @param {string} userId - id of current user
   * @param {string} authToken - token for checking permissions
   */
  publishRemovePresentationMessage(presentationId, meetingId, authToken, userId ) {
    if(!isAllowedTo('deletePresentation', meetingId, userId, authToken)){
      return;
    }
    let message = {
      "payload": {
        "presentation_id": presentationId,
        "meeting_id": meetingId
      },
      "header": {
        "name": "remove_presentation"
      }
    };
    return publish(Meteor.config.redis.channels.toBBBApps.presentation, message);
  },
  publishSwitchToPreviousSlideMessage(meetingId, userId, authToken) {
    let currentPresentationDoc, currentSlideDoc, message, previousSlideDoc;
    currentPresentationDoc = Meteor.Presentations.findOne({
      "meetingId": meetingId,
      "presentation.current": true
    });
    if(currentPresentationDoc != null) {
      currentSlideDoc = Meteor.Slides.findOne({
        "meetingId": meetingId,
        "presentationId": currentPresentationDoc.presentation.id,
        "slide.current": true
      });
      if(currentSlideDoc != null) {
        previousSlideDoc = Meteor.Slides.findOne({
          "meetingId": meetingId,
          "presentationId": currentPresentationDoc.presentation.id,
          "slide.num": currentSlideDoc.slide.num - 1
        });
        if((previousSlideDoc != null) && isAllowedTo('switchSlide', meetingId, userId, authToken)) {
          message = {
            "payload": {
              "page": previousSlideDoc.slide.id,
              "meeting_id": meetingId
            },
            "header": {
              "name": "go_to_slide"
            }
          };
          return publish(Meteor.config.redis.channels.toBBBApps.presentation, message);
        }
      }
    }
  },
  publishSwitchToNextSlideMessage(meetingId, userId, authToken) {
    let currentPresentationDoc, currentSlideDoc, message, nextSlideDoc;
    currentPresentationDoc = Meteor.Presentations.findOne({
      "meetingId": meetingId,
      "presentation.current": true
    });
    if(currentPresentationDoc != null) {
      currentSlideDoc = Meteor.Slides.findOne({
        "meetingId": meetingId,
        "presentationId": currentPresentationDoc.presentation.id,
        "slide.current": true
      });
      if(currentSlideDoc != null) {
        nextSlideDoc = Meteor.Slides.findOne({
          "meetingId": meetingId,
          "presentationId": currentPresentationDoc.presentation.id,
          "slide.num": currentSlideDoc.slide.num + 1
        });
        if((nextSlideDoc != null) && isAllowedTo('switchSlide', meetingId, userId, authToken)) {
          message = {
            "payload": {
              "page": nextSlideDoc.slide.id,
              "meeting_id": meetingId
            },
            "header": {
              "name": "go_to_slide"
            }
          };
          return publish(Meteor.config.redis.channels.toBBBApps.presentation, message);
        }
      }
    }
  },
  /**
   * Deletes presentation convertation error
   *
   * @param {string} meetingId - id of current meeting
   */
  removeConvertationError(meetingId){
    Meteor.Meetings.update({
      meetingId: meetingId
    },{
      $set:{
        "convert.error": false
      }
    });
  }
});

// --------------------------------------------------------------------------------------------
// Private methods on server
// --------------------------------------------------------------------------------------------
this.addPresentationToCollection = function(meetingId, presentationObject) {
  let entry, id, presentationObj;
  //check if the presentation is already in the collection
  presentationObj = Meteor.Presentations.findOne({
    meetingId: meetingId,
    'presentation.id': presentationObject.id
  });
  if(presentationObj == null) {
    entry = {
      meetingId: meetingId,
      presentation: {
        id: presentationObject.id,
        name: presentationObject.name,
        current: presentationObject.current
      }
    };
    return id = Meteor.Presentations.insert(entry);
    //Meteor.log.info "presentation added id =[#{id}]:#{presentationObject.id} in #{meetingId}. Presentations.size is now #{Meteor.Presentations.find({meetingId: meetingId}).count()}"
  }
};

this.removePresentationFromCollection = function(meetingId, presentationId) {
  let id, presentationObject;
  presentationObject = Meteor.Presentations.findOne({
    meetingId: meetingId,
    "presentation.id": presentationId
  });
  if(presentationObject != null){
    Meteor.Slides.remove({
        presentationId: presentationId
      }, Meteor.log.info(`cleared Slides Collection (presentationId: ${presentationId}!`));
    Meteor.Presentations.remove(presentationObject._id);
    return Meteor.log.info(`----removed presentation[${presentationId}] from ${meetingId}`);
  }
};

// called on server start and meeting end
this.clearPresentationsCollection = function(meetingId) {
  if(meetingId != null) {
    return Meteor.Presentations.remove({
      meetingId: meetingId
    }, Meteor.log.info(`cleared Presentations Collection (meetingId: ${meetingId}!`));
  } else {
    return Meteor.Presentations.remove({}, Meteor.log.info("cleared Presentations Collection (all meetings)!"));
  }
};

/**
 * Handles server message about progress of presentation conversation
 *
 * @param {object} payload
 */
this.presentationConversionProgress = function(payload) {
    Meteor.Meetings.update({
        meetingId: payload.meeting_id
    }, {
        $set: {
            "convert.presentation_name": payload.presentation_name,
            "convert.pages_completed": payload.pages_completed,
            "convert.num_pages": payload.num_pages,
            "convert.in_progress": true,
            "convert.error": false
        }
    })
};

/**
 * Handles server message about end of presentation conversation
 *
 * @param {object} payload
 */
this.presentationConversionDone = function(payload) {
  Meteor.Meetings.update({
    meetingId: payload.meeting_id
  }, {
    $set: {
      "convert.presentation_name": 0,
      "convert.pages_completed": 0,
      "convert.num_pages": 0,
      "convert.in_progress": false,
      "convert.error": false
    }
  })
};

/**
 * Handles server message about error of presentation conversation
 *
 * @param {object} payload
 */
this.presentationConversionError = function(payload) {
  this.presentationConversionDone(payload);
  Meteor.Meetings.update({
    meetingId: payload.meeting_id
  }, {
    $set: {
      "convert.presentation_name": payload.presentation_name,
      "convert.error": `Error:: Too many pages (max=${payload.max_num_pages})`
    }
  })
};
// --------------------------------------------------------------------------------------------
// end Private methods on server
// --------------------------------------------------------------------------------------------
