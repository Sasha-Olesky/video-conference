/**
 * This file is used to place on bbb server and retrieve information from steamboat server about how many seconds left
 * before meeting automatically ends. If left 10 minutes - show alert for user about it one time and stop checks.
 */

(function($, BBB) {
    var alertShown = false,
        // check current meeting time every N miliseconds
        timeout = 60000,
        // warn user N seconds before meeting end
        alertDelta = 1800,
        interval;

    function checkSecondsLeft() {
        var bbbMeetingId = null;
        BBB.getMeetingID(function(value){ bbbMeetingId = value; });

        var webAppHostname = null;
        BBB.getMyUserInfo(function(userInfo) {
            // we use '_____' as separator of values
            var myUserDataArray = userInfo.myExternalUserID.split("_____");
            if (myUserDataArray.length < 3) {
                return;
            }
            webAppHostname = myUserDataArray[2];
        });

        // we need to know both bbbMeetingId and webAppHostname to be able to continue
        if (null === bbbMeetingId || null === webAppHostname) {
            console.log('I was not able to find bbbMeetingId or webAppHostname');
            return;
        }

        // retrieve information from web application server about time left 
        $.ajax({
            type: 'GET',
            url: 'https://' + webAppHostname + '/sync-meeting/' + bbbMeetingId + '/info',
            async: true,
            jsonpCallback: 'getSecondsLeft',
            contentType: "application/json",
            dataType: 'jsonp',
            success: function (data) {
                if (data.success) {
                    // if we have less than threshold we show alert and stop checking time left
                    if (data.secondsLeft <= alertDelta) {
                        clearInterval(interval);
                        alertShown = true;
                        alert('Your meeting is scheduled to end in 10 minutes but we have added an additional 20 minutes to your meeting duration to allow for more time if necessary.');
                    }
                } else {
                    console.log(data.message);
                }
            },
            error: function () {
                console.log('Retrieving meeting data is failed');
            }
        });
    }

    interval = setInterval(function(){
        if (!alertShown) {
            checkSecondsLeft();
        }
    }, timeout);


})(jQuery, BBB);