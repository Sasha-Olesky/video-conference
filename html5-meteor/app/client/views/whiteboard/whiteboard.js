let fakeUpload;

// scale the whiteboard to adapt to the resized window
this.scaleWhiteboard = function(callback) {
  let adjustedDimensions;
  adjustedDimensions = scaleSlide(getInSession('slideOriginalWidth'), getInSession('slideOriginalHeight'));
  if(typeof whiteboardPaperModel !== "undefined" && whiteboardPaperModel !== null) {
    whiteboardPaperModel.scale(adjustedDimensions.width, adjustedDimensions.height);
  }
  if(callback) {
    callback();
  }
};

Template.whiteboard.helpers({
  isPollStarted() {
    if(BBB.isPollGoing(getInSession('userId'))) {
      return true;
    } else {
      return false;
    }
  },
  hasNoPresentation() {
    return Meteor.Presentations.findOne({
      'presentation.current': true
    });
  },
  forceSlideShow() {
    return reactOnSlideChange();
  },
  clearSlide() {
    let ref;
    //clear the slide
    if(typeof whiteboardPaperModel !== "undefined" && whiteboardPaperModel !== null) {
      whiteboardPaperModel.removeAllImagesFromPaper();
    }
    //hide the cursor
    return typeof whiteboardPaperModel !== "undefined" && whiteboardPaperModel !== null ? (ref = whiteboardPaperModel.cursor) != null ? ref.remove() : void 0 : void 0;
  }
});


Template.whiteboard.events({
  'click .whiteboardFullscreenButton'(event, template) {
    return enterWhiteboardFullscreen();
  },
  'click .exitFullscreenButton'(event, template) {
    if(document.exitFullscreen) {
      return document.exitFullscreen();
    } else if(document.mozCancelFullScreen) {
      return document.mozCancelFullScreen();
    } else if(document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    }
  },
  'click .inactiveEmojiButton'(event) {
    if($(event.target).css('opacity') === '1') {
      BBB.setEmojiStatus(
        BBB.getMeetingId(),
        getInSession('userId'),
        getInSession('userId'),
        getInSession('authToken'),
        this.name
      );
      $('.FABTriggerButton').blur();
      return toggleEmojisFAB();
    }
  },
  'click .activeEmojiButton'(event) {
    if($('.activeEmojiButton').css('opacity') === '1') {
      BBB.setEmojiStatus(
        BBB.getMeetingId(),
        getInSession('userId'),
        getInSession('userId'),
        getInSession('authToken'),
        "none"
      );
      $('.FABTriggerButton').blur();
      return toggleEmojisFAB();
    }
  },
  'click .FABTriggerButton'(event) {
    $('.FABTriggerButton').blur();
    return toggleEmojisFAB();
  }
});

Template.whiteboardControls.helpers({
  presentationProgress() {
    let currentPresentation, currentSlideNum, ref, ref1, totalSlideNum;
    currentPresentation = Meteor.Presentations.findOne({
      'presentation.current': true
    });
    currentSlideNum = (ref = Meteor.Slides.findOne({
      'presentationId': currentPresentation != null ? currentPresentation.presentation.id : void 0,
      'slide.current': true
    })) != null ? ref.slide.num : void 0;
    totalSlideNum = (ref1 = Meteor.Slides.find({
      'presentationId': currentPresentation != null ? currentPresentation.presentation.id : void 0
    })) != null ? ref1.count() : void 0;
    if(currentSlideNum !== void 0) {
      return `${currentSlideNum}/${totalSlideNum}`;
    } else {
      return '';
    }
  }
});

Template.whiteboardControls.events({
  'click .whiteboard-buttons-slide > .prev'(event) {
    return BBB.goToPreviousPage();
  },
  'click .whiteboard-buttons-slide > .next'(event) {
    return BBB.goToNextPage();
  },
  'click .switchSlideButton'(event) {
    return $('.tooltip').hide();
  }
});

Template.polling.events({
  'click .pollButtons'(event) {
    let _id, _key;
    _key = this.label;
    _id = this.answer;
    return BBB.sendPollResponseMessage(_key, _id);
  }
});

Template.polling.rendered = function() {
  return scaleWhiteboard();
};

Template.polling.destroyed = function() {
  return setTimeout(scaleWhiteboard, 0);
};

Template.whiteboardControls.rendered = function() {
  return scaleWhiteboard();
};

Template.whiteboardControls.destroyed = function() {
  return setTimeout(scaleWhiteboard, 0);
};

Template.whiteboard.rendered = function() {
  $('#whiteboard').resizable({
    handles: 'e',
    minWidth: 150,
    resize() {
      return adjustChatInputHeight();
    },
    start() {
      if($('#chat').width() / $('#panels').width() > 0.2) { // chat shrinking can't make it smaller than one fifth of the whiteboard-chat area
        return $('#whiteboard').resizable('option', 'maxWidth', $('#panels').width() - 200); // gives the chat enough space (200px)
      } else {
        return $('#whiteboard').resizable('option', 'maxWidth', $('#whiteboard').width());
      }
    },
    stop() {
      $('#whiteboard').css('width', `${100 * $('#whiteboard').width() / $('#panels').width()}%`); // transforms width to %
      return $('#whiteboard').resizable('option', 'maxWidth', null);
    }
  });

  // whiteboard element needs to be available
  Meteor.NotificationControl = new NotificationControl('notificationArea');

  return $(document).foundation(); // initialize foundation javascript
};

Template.presenterUploaderControl.created = function() {
  this.isOpen = new ReactiveVar(false);
  this.files = new ReactiveList({
    sort(a, b) {
      // Put the ones who still uploading first
      let ref, ref1;
      return (ref = a.isUploading === b.isUploading) != null ? ref : {
        0: (ref1 = a.isUploading) != null ? ref1 : -{
          1: 1
        }
      };
    }
  });
  this.presentations = Meteor.Presentations.find({}, {
    sort: {
      'presentation.current': -1,
      'presentation.name': 1
    },
    fields: {
      'presentation': 1
    }
  });
  return this.meetings = Meteor.Meetings.find({});
};

fakeUpload = function(file, list) {
  return setTimeout((() => {
    file.uploadedSize = file.uploadedSize + (Math.floor(Math.random() * file.size + file.uploadedSize) / 10);
    if (!(file.size > file.uploadedSize)) {
      file.uploadedSize = file.size;
      file.isUploading = false;
    }
    list.update(file.name, file);
    if(file.isUploading === true) {
      return fakeUpload(file, list);
    } else {
      return list.remove(file.name); // TODO: Here we should remove and update te presentation on mongo
    }
  }), 200);
};

Template.presenterUploaderControl.events({
  'click .js-open'(event, template) {
    return template.isOpen.set(true);
  },
  'click .js-close'(event, template) {
    return template.isOpen.set(false);
  },
  'dragover [data-dropzone]'(e) {
    e.preventDefault();
    return $(e.currentTarget).addClass('hover');
  },
  'dragleave [data-dropzone]'(e) {
    e.preventDefault();
    return $(e.currentTarget).removeClass('hover');
  },
  'drop [data-dropzone], change [data-dropzone] > input[type="file"]'(e, template) {
    let files;
    e.preventDefault();
    files = (e.originalEvent.dataTransfer || e.originalEvent.target).files;
    return _.each(files, file => {
      file.isUploading = true;
      file.uploadedSize = 0;
      file.percUploaded = 0;
      template.files.insert(file.name, file);
      return fakeUpload(file, template.files);
    });
  }
});

Template.presenterUploaderControl.helpers({
  isOpen() {
    return Template.instance().isOpen.get();
  },
  files() {
    return Template.instance().files.fetch();
  },
  presentations() {
    return Template.instance().presentations.fetch().map(x => {
      return x.presentation;
    });
  }
});

Template.presenterUploaderControlConvertation.helpers({
  meetings() {
    return Meteor.Meetings.findOne();
  }
});

Template.presenterUploaderControl.helpers({
  meetings() {
    return Meteor.Meetings.findOne();
  }
});

Template.conversationError.helpers({
  meetings() {
    return Meteor.Meetings.findOne();
  }
});

Template.conversationError.events({
  "click .js-delete-presentation-error"(e){
    Meteor.call("removeConvertationError", getInSession('meetingId'));
  }
});

Template.presenterUploaderControlFileListItem.helpers({
  percUploaded() {
    return Math.round((this.uploadedSize / this.size) * 100);
  }
});

Template.presenterUploaderControlPresentationListItem.events({
  'click [data-action-show]'(event, template) {
    return console.info('Should show the file `' + this.name + '`');
  },
  'click [data-action-delete]'(event, template) {
    return console.info('Should delete the file `' + this.name + '`');
  }
});
Template.presenterDrawingControl.rendered = function () {
  $(function () {
    if(!window.drawer){
      window.drawer = new window.Drawer();
    } else {
      window.drawer.initCustomRangeSlider();
    }

  });
};
Template.createPolling.events({
  "click .js-create-polling, .js-poll-variant" (e){
    $(".js-poll-variants").slideToggle(100);
  },
  "click .js-poll-variant"(e) {
    var type = $(e.target).data("type");
    if(!type || type == "Custom"){
      return;
    }
    var pollId = generatePollId();
    Meteor.call("startPolling",
                getInSession('meetingId'),
                getInSession('userId'),
                pollId,
                type,
                getInSession('authToken'))
    $(".js-poling-results").foundation('reveal', 'open');
  },
  "click .js-open-custom-poll" (e) {
    $(".js-poling-custom").foundation('reveal', 'open');
  }
});

/**
 * Generates new unique poll id
 *
 * @return {string} - new unique poll id
 */
function generatePollId() {
  var slide = BBB.getCurrentSlide();
  return slide.meetingId + '/' + slide.slide.num + '/' + new Date().getTime();
}

Template.polingResults.helpers({
 /**
  * Gets current poll
  *
  * @return {Object|undefined}
  */
  currentPoll(){
    return Meteor.Polls.find({}, {sort: {createdAt: 1}, limit: 1}).fetch()[0];
  },
    /**
     * Calculates percent of one value in another
     * @param value
     * @param base
     * @return {number}
     */
    getPercent(value, base){
        value = value >= 0 ? value : 0;
        base = base > 0 ? base : 1;
        return value / base * 100;
    },
    /**
     * Returns status of poll depends on current responses
     *
     * @param {Object} poll
     * @return {string}
     */
    getStatus(poll){
        if(!poll){
            return '';
        }
        var responders = poll.poll_info.poll.num_responders;
        var respondents = poll.poll_info.poll.num_respondents;
        responders = responders >= 0 ? responders : 0;
        respondents = respondents >= 0 ? respondents : 0;
        if(responders == 0 ){
            return "Waiting for responders...";
        } else if(responders == respondents){
            return "Done"
        } else {
            return responders + "/" + respondents
        }
    }
});

Template.polingResults.rendered = function () {
    $(document).on("click", '.js-cancel-poling, .js-publish-poling', function () {
        $(".js-poling-results").foundation('reveal', 'close');
    });

    $(document).on("click", ".js-cancel-poling", function (e) {
      var pollId = $(e.target).attr("data-poll-id");
      if(!pollId){
        return;
      }
      Meteor.call("stopPolling",
          getInSession('meetingId'),
          getInSession('userId'),
          pollId,
          getInSession('authToken'))
    });
    $(document).on("click", ".js-publish-poling", function (e) {
        var pollId = $(e.target).attr("data-poll-id");
        if(!pollId){
            return;
        }
        Meteor.call("publishPolling",
            getInSession('meetingId'),
            getInSession('userId'),
            pollId,
            getInSession('authToken'));
    });
};

Template.customPoll.rendered = function () {
  $(document).on("click", '.js-cancel-create-custom-poling, .js-start-poll', function () {
    $(".js-poling-custom").foundation('reveal', 'close');
  });

  $(document).on("click", ".js-start-poll", function (e) {
    var answers = [];
    var inputs = $(".customPollBody").find('input');
    inputs.each(function () {
      var value = $(this).val();
      if(value){
        answers.push(value);
      }
    });
    if(!answers.length){
      return;
    }
    Meteor.call("startCustomPolling",
        answers,
        getInSession('meetingId'),
        getInSession('userId'),
        generatePollId(),
        getInSession('authToken'));

    $(".js-poling-results").foundation('reveal', 'open');
  });
};