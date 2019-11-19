/**
 * Pseudo-class for file uploading
 *
 * @constructor
 */
function FileUploader() {
    this.uploadUrl = "/bbb-nodejs/uploadfile";
    this.uploaderClass = "js-upload-file";
    this.uploaderSelector = "."+this.uploaderClass;
    this.init();
}

/**
 * Initialization
 */
FileUploader.prototype.init = function () {
    this.initHandlers();
};

/**
 * Adds DOM events handlers for file uploading
 */
FileUploader.prototype.initHandlers = function () {
    $(document).on("change", this.uploaderSelector, this.upload.bind(this));
};

/**
 * Fires after user selects file to upload.
 * Sends file to server and sends it to the chat if uploading was successfully.
 * Also shows file uploading progress.
 *
 * @param e
 */
FileUploader.prototype.upload = function (e) {
    var loader = $(".file-upload-loader");
    var fileUploadWrapper =  $('.file-upload-wrapper');

    loader.show();
    var target = $(e.target);
    var _this = this;
    var file = e.target.files[0];
    var formData = new FormData();
    BBB.getMyUserInfo(function(userInfo) {
        var myUserDataArray = userInfo.myInternalUserID.split("_____");
        if(myUserDataArray.length < 3) {
            return console.error("Wrong internal user id",myUserDataArray);
        }
        formData.append("host", myUserDataArray[2]);
        formData.append("meetingId", myUserDataArray[1]);
        formData.append("file", file);
        $.ajax({
            xhr: function () {
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener("progress", function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = Math.round((evt.loaded / evt.total)*100);
                        loader.html(percentComplete + "%");
                    }
                }, false);

                return xhr;
            },
            url: _this.uploadUrl,
            data: formData,
            processData: false,
            contentType: false,
            method: "POST",
            success: function(file) {
                var message = _this.getFileMessage( file.fileName, file.downloadUrl);
                BBB.sendPublicChatMessage("black", "en", message);
                target.replaceWith(target.clone(true));
                loader.hide();
            },
            error: function () {
                fileUploadWrapper.addClass("error");
                loader.html("Error");
                setTimeout(function () {
                    fileUploadWrapper.removeClass("error");
                    loader.hide();
                }, 2000);
                target.replaceWith(target.clone(true));
            }
        })
    });
};

/**
 * Generates chat message
 *
 * @param {string} fileName
 * @param {string} downloadUrl
 * @return {string}
 */
FileUploader.prototype.getFileMessage = function(fileName ,downloadUrl){
    var message = '';
    message += 'File: ';
    var downloadLink = $('<a></a>');
    downloadLink.attr({
       "href":  'event:' + downloadUrl
    });
    downloadLink.text(fileName);
    message += downloadLink[0].outerHTML;
    return message;
};

$(window).on("load", function () {
    new FileUploader();
});