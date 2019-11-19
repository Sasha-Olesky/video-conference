/**
 * This file is used to place on bbb server and send requests to YSU server every 5 minutes to prolong user attendance session
 */

(function ($, BBB) {

    setInterval(function () {
        BBB.getMyUserInfo(function(userInfo) {
            // we use '_____' as separator of values
            var myUserDataArray = userInfo.myExternalUserID.split("_____");
            if (myUserDataArray.length < 5) {
                return;
            }
            var webAppHostname = myUserDataArray[2];
            var userRole = myUserDataArray[4];

            if (!webAppHostname || !userRole) {
                console.log('I was not able to find userRole or webAppHostname');
                return;
            }

            $.ajax({
                type: 'GET',
                url: 'https://' + webAppHostname + '/' + userRole + '/attendance-tracking/update/0',
                async: true,
                jsonpCallback: 'attendanceTracking',
                contentType: "application/json",
                dataType: 'jsonp',
                error: function () {
                    console.log('Updating attendance tracking failed');
                }
            });
        });

    }, 1000 * 60 * 5);
})(jQuery, BBB);
