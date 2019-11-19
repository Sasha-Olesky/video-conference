// --------------------------------------------------------------------------------------------
// Public methods on server
// --------------------------------------------------------------------------------------------
Meteor.methods({
  publishVoteMessage(meetingId, pollAnswerId, requesterUserId, requesterToken) {
    let _poll_id, eventName, message, result;
    if (isAllowedTo("subscribePoll", meetingId, requesterUserId, requesterToken)) {
      eventName = "vote_poll_user_request_message";
      result = Meteor.Polls.findOne({
        "poll_info.users": requesterUserId,
        "poll_info.meetingId": meetingId,
        "poll_info.poll.answers.id": pollAnswerId
      }, {
        fields: {
          "poll_info.poll.id": 1,
          _id: 0
        }
      });
      _poll_id = result.poll_info.poll.id;
      if ((eventName != null) && (meetingId != null) && (requesterUserId != null) && (_poll_id != null) && (pollAnswerId != null)) {
        message = {
          header: {
            timestamp: new Date().getTime(),
            name: eventName
          },
          payload: {
            meeting_id: meetingId,
            user_id: requesterUserId,
            poll_id: _poll_id,
            question_id: 0,
            answer_id: pollAnswerId
          }
        };
        Meteor.Polls.update({
          "poll_info.users": requesterUserId,
          "poll_info.meetingId": meetingId,
          "poll_info.poll.answers.id": pollAnswerId
        }, {
          $pull: {
            "poll_info.users": requesterUserId
          }
        });
        Meteor.log.info("publishing Poll response to redis");
        return publish(Meteor.config.redis.channels.toBBBApps.polling, message);
      }
    }
  },
  /**
   * Sends to server message for creating new polling
   *
   * @param meetingId
   * @param requesterUserId
   * @param pollId
   * @param pollType
   * @param authToken
   */
  startPolling(meetingId, requesterUserId, pollId , pollType, authToken) {
  if (!isAllowedTo("pollOperations", meetingId, requesterUserId, authToken)) {
      return;
  }
  let message = {
    payload: {
      "meeting_id": meetingId,
      "requester_id": requesterUserId,
      "poll_id": pollId,
      "poll_type": pollType
    },
    header: {
      "name": "start_poll_request_message"
    }
  };
  return publish(Meteor.config.redis.channels.toBBBApps.polling, message);
  },
  /**
   * Sends to server message for stop polling
   *
   * @param meetingId
   * @param requesterUserId
   * @param pollId
   * @param authToken
   */
  stopPolling(meetingId, requesterUserId, pollId ,authToken){
    if (!isAllowedTo("pollOperations", meetingId, requesterUserId, authToken)) {
        return;
    }
    let message = {
      payload: {
        "meeting_id": meetingId,
        "requester_id": requesterUserId,
        "poll_id": pollId,
      },
      header: {
        "name": "stop_poll_request_message"
      }
    };
    return publish(Meteor.config.redis.channels.toBBBApps.polling, message);
  },
/**
 * Sends to server message for display poll results for all users
 *
 * @param meetingId
 * @param requesterUserId
 * @param pollId
 * @param authToken
 */
  publishPolling(meetingId, requesterUserId, pollId ,authToken) {
      if (!isAllowedTo("pollOperations", meetingId, requesterUserId, authToken)) {
          return;
      }
      let message = {
      payload: {
        "meeting_id": meetingId,
        "requester_id": requesterUserId,
        "poll_id": pollId,
        "show": true
      },
      header: {
        "name": "show_poll_result_request_message"
      }
    };
    return publish(Meteor.config.redis.channels.toBBBApps.polling, message);
  },
    /**
     * Sends to server message for starting polling with custom answers
     * @param answers
     * @param meetingId
     * @param requesterUserId
     * @param pollId
     * @param authToken
     */
    startCustomPolling(answers, meetingId, requesterUserId, pollId ,authToken) {
        if (!isAllowedTo("pollOperations", meetingId, requesterUserId, authToken)) {
            return;
        }
        let message = {
            payload: {
                "answers": answers,
                "meetingId": meetingId,
                "requesterId": requesterUserId,
                "pollId": pollId,
                "pollType": "Custom"
            },
            header: {

                "name": "start_custom_poll_request_message"
            }
        };
        return publish(Meteor.config.redis.channels.toBBBApps.polling, message);
    }
});


// --------------------------------------------------------------------------------------------
// Private methods on server
// --------------------------------------------------------------------------------------------
this.addPollToCollection = function(poll, requester_id, users, meetingId) {
  let _users, answer, entry, i, j, user;
  //copying all the userids into an array
  _users = [];
  _users_length = users.length;
  for (i = 0; i < _users_length; i++) {
    user = users[i];
    _users.push(user.user.userid);
  }
  //adding the initial number of votes for each answer
  _answers = poll.answers;
  _answers_length = _answers.length;
  for (j = 0; j < _answers_length; j++) {
    answer = _answers[j];
    answer.num_votes = 0;
  }
  //adding the initial number of responders and respondents to the poll, which will be displayed for presenter (in HTML5 client) when he starts the poll
  poll.num_responders = -1;
  poll.num_respondents = -1;

  //adding all together and inserting into the Polls collection
  entry = {
    poll_info: {
      "meetingId": meetingId,
      "poll": poll,
      "requester": requester_id,
      "users": _users
    }
  };
  Meteor.log.info(`added poll _id=[${poll.id}]:meetingId=[${meetingId}].`);
  return Meteor.Polls.insert(entry);
};

this.clearPollCollection = function(meetingId, poll_id) {
  if (meetingId != null && poll_id != null && Meteor.Polls.findOne({
    "poll_info.meetingId": meetingId,
    "poll_info.poll.id": poll_id
  }) != null) {
    return Meteor.Polls.remove({
      "poll_info.meetingId": meetingId,
      "poll_info.poll.id": poll_id
    }, Meteor.log.info(`cleared Polls Collection (meetingId: ${meetingId}, pollId: ${poll_id}!)`));
  } else {
    return Meteor.Polls.remove({}, Meteor.log.info("cleared Polls Collection (all meetings)!"));
  }
};

this.updatePollCollection = function(poll, meetingId, requesterId) {
  if ((poll.answers != null) && (poll.num_responders != null) && (poll.num_respondents != null) && (poll.id != null) && (meetingId != null) && (requesterId != null)) {
    return Meteor.Polls.update({
      "poll_info.meetingId": meetingId,
      "poll_info.requester": requesterId,
      "poll_info.poll.id": poll.id
    }, {
      $set: {
        "poll_info.poll.answers": poll.answers,
        "poll_info.poll.num_responders": poll.num_responders,
        "poll_info.poll.num_respondents": poll.num_respondents
      }
    }, Meteor.log.info(`updating Polls Collection (meetingId: ${meetingId}, pollId: ${poll.id}!)`));
  }
};
