$('document').ready(function () {
    loadIframe();
});

$(document).off('click','.start-record').on('click','.start-record', function () {
   toggleMeetingRecord(true);
});
$(document).off('click','.stop-record').on('click','.stop-record', function () {
    toggleMeetingRecord(false);
});

function toggleMeetingRecord(status) {
    var user = BBB.getCurrentUser();
    var room = user.meetingId;
    var userId = user.userId;
    var data = {
        userId: userId,
        roomId: room,
        record: status
    };
    $.ajax({
        method:"POST",
        data: data,
        url:  window.CONFERENCE_SERVER_URL+'/toggle-recording',
        success: function (data) {
        }
    });

}

function loadIframe() {
    var user = BBB.getCurrentUser();
    if (!user || !user.meetingId || !user.user.name) {
        return setTimeout(loadIframe, 500);
    }
    var room = user.meetingId;
    var name = user.user.name;
    var userId = user.userId;
    var html_str = '<iframe id="conf" src="/html5client/conference/videoconference.html?roomName=' + room + '&userName=' + name + '&userId='+ userId +'" style="width:100%; min-height:100%;background-color:#fff;" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true"></iframe>';
    $('#myModal .modal-body').html(html_str);
}

function start() {
    if(!$('#myModal').is(':visible')){
        showconf();
    }
    var el = document.getElementById('conf');
    getIframeWindow(el).startBroadcast();
    $('#sh-cam').hide();
    $('#dis-cam').show();
}

function startDeskshare() {
    if(!$('#myModal').is(':visible')){
        showconf();
    }
    var el = document.getElementById('conf');
    getIframeWindow(el).startDeskshareBroadcast();
    $("#dis-desktop").show();
    $('#sh-desktop').hide();
}

function enableDeskshareIcon() {
    $("#dis-desktop").hide();
    $('#sh-desktop').show();
}

function stop() {
    var el = document.getElementById('conf');
    getIframeWindow(el).stopBroadcast();
    $('#sh-cam').show();
    $('#dis-cam').hide();
}

function stopDeskshare() {
    var el = document.getElementById('conf');
    getIframeWindow(el).stopDeskshare();
    $("#dis-desktop").hide();
    $('#sh-desktop').show();
}

function leave() {
    var el = document.getElementById('iframe-div');
    el.innerHTML = '';
}

function showconf() {
    var el = $('#myModal');
    el.fadeToggle(50);
    var x = (window.innerWidth - el.outerWidth()) / 2;
    var y = (window.innerHeight - el.outerHeight()) / 2;
    el.css({top: y, left: x});
}

function toggleModal(selector) {
    var el = $(selector);
    el.fadeToggle(50);
    var x = (window.innerWidth - el.outerWidth()) / 2;
    var y = (window.innerHeight - el.outerHeight()) / 2;
    el.css({top: y, left: x});
}
window.toggleModal = toggleModal;

function getIframeWindow(iframe_object) {
    var doc;
    if (iframe_object.contentWindow) {
        return iframe_object.contentWindow;
    }

    if (iframe_object.window) {
        return iframe_object.window;
    }

    if (!doc && iframe_object.contentDocument) {
        doc = iframe_object.contentDocument;
    }

    if (!doc && iframe_object.document) {
        doc = iframe_object.document;
    }

    if (doc && doc.defaultView) {
        return doc.defaultView;
    }

    if (doc && doc.parentWindow) {
        return doc.parentWindow;
    }

    return undefined;
}
document.ondragstart = function (e) {
    e.preventDefault();
    return false;
};

$(function () {
    var modalSelector = ".modal";
    var modalBodySelector = ".modal-body";
    var minModalWidth = 200;
    var minModalHeight = 200;

    $(document).on("mousedown", '.modal-header', moveModalHandler);
    $(document).on("mousedown", '.modal-resize-left', resizeLeftHandler);
    $(document).on("mousedown", '.modal-resize-right', resizeRightHandler);
    $(document).on("mousedown", '.modal-resize-top', resizeTopHandler);
    $(document).on("mousedown", '.modal-resize-bottom', resizeBottomHandler);

    /**
     * Moves modal on the page
     *
     * @param {Object} e
     */
    function moveModalHandler(e) {
        var startMouseX = e.pageX;
        var startMouseY = e.pageY;
        var modalElem = $(e.target).closest(modalSelector);
        var startModalX = modalElem.offset().left;
        var startModalY = modalElem.offset().top;
        $(document).on("mousemove", moveModal);
        $(document).on("mouseup", function cancelMove() {
            $(document).off("mousemove", moveModal);
            $(document).off("mouseup", cancelMove);
        });
        function moveModal(e) {
            var currentMouseX = e.pageX;
            var currentMouseY = e.pageY;
            var newX = (currentMouseX - startMouseX) + startModalX;
            var newY = (currentMouseY - startMouseY) + startModalY;
            modalElem.css({top: newY, left: newX});
        }
    }

    /**
     * Resizes modal from left to right
     *
     * @param {Object} e
     */
    function resizeLeftHandler(e) {
        var resizer = $(this);
        var startMouseX = e.pageX;
        var modalElem = $(e.target).closest(modalSelector);
        var startModalWidth = modalElem.outerWidth();
        var startModalX = modalElem.offset().left;
        resizer.css({width: "100%"});
        $(window).on("mousemove", resizeLeft);
        $(document).on("mouseup", function cancelMove() {
            resizer.css({width: "0"});
            $(window).off("mousemove", resizeLeft);
            $(document).off("mouseup", cancelMove);
        });
        function resizeLeft(e) {
            var currentMouseX = e.pageX;
            var diffX = currentMouseX - startMouseX;
            var newWidth = startModalWidth - diffX;
            var newX = startModalX + diffX;
            if (newWidth < minModalWidth) {
                newWidth = minModalWidth;
                newX = startModalWidth - minModalWidth + startModalX;
            }
            modalElem.css({width: newWidth, left: newX});
        }
    }

    /**
     * Resizes modal from right to left
     *
     * @param {Object} e
     */
    function resizeRightHandler(e) {
        var resizer = $(this);
        var startMouseX = e.pageX;
        var modalElem = $(e.target).closest(modalSelector);
        var startModalWidth = modalElem.outerWidth();
        resizer.css({width: "100%"});
        $(window).on("mousemove", resizeRight);
        $(document).on("mouseup", function cancelMove() {
            resizer.css({width: "0"});
            $(window).off("mousemove", resizeRight);
            $(document).off("mouseup", cancelMove);
        });
        function resizeRight(e) {
            var currentMouseX = e.pageX;
            var diffX = currentMouseX - startMouseX;
            var newWidth = startModalWidth + diffX;
            if (newWidth < minModalWidth) {
                newWidth = minModalWidth;
            }
            modalElem.css({width: newWidth});
        }
    }

    /**
     * Resizes modal from top to bottom
     *
     * @param {Object} e
     */
    function resizeTopHandler(e) {
        var resizer = $(this);
        var startMouseY = e.pageY;
        var modalElem = $(e.target).closest(modalSelector);
        var modalBody = modalElem.find(modalBodySelector);
        var startModalHeight = modalBody.outerHeight();
        var startModalY = modalElem.offset().top;
        resizer.css({height: "100%"});
        $(window).on("mousemove", resizeTop);
        $(document).on("mouseup", function cancelMove() {
            resizer.css({height: "0"});
            $(window).off("mousemove", resizeTop);
            $(document).off("mouseup", cancelMove);
        });
        function resizeTop(e) {
            var currentMouseY = e.pageY;
            var diffY = currentMouseY - startMouseY;
            var newHeight = startModalHeight - diffY;
            var newY = startModalY + diffY;
            if (newHeight < minModalHeight) {
                newHeight = minModalHeight;
                newY = startModalHeight - minModalHeight + startModalY;
            }
            modalElem.css({top: newY});
            modalBody.css({height: newHeight})
        }
    }

    /**
     * Resizes modal from bottom to top
     *
     * @param {Object} e
     */
    function resizeBottomHandler(e) {
        var resizer = $(this);
        var startMouseY = e.pageY;
        var modalElem = $(e.target).closest(modalSelector);
        var modalBody = modalElem.find(modalBodySelector);
        var startModalHeight = modalBody.outerHeight();
        resizer.css({height: "100%"});
        $(window).on("mousemove", resizeBottom);
        $(document).on("mouseup", function cancelMove() {
            resizer.css({height: "0"});
            $(window).off("mousemove", resizeBottom);
            $(document).off("mouseup", cancelMove);
        });
        function resizeBottom(e) {
            var currentMouseY = e.pageY;
            var diffY = currentMouseY - startMouseY;
            var newHeight = startModalHeight + diffY;
            if (newHeight < minModalHeight) {
                newHeight = minModalHeight;
            }
            modalBody.css({height: newHeight})
        }
    }
});