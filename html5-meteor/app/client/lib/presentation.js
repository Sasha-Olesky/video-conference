/**
 * Class for presenter operations with presentations
 * @constructor
 */
function Presentation() {
    this.selectors = {
        fileInput: ".presenter-uploader-dropzone-fileinput",
        deletePresentation: ".js-delete-presentation",
        showPresentation: ".js-show-presentation"
    };
    this.init();
}

/**
 * For instant initialization
 */
Presentation.prototype.init = function () {
    this.addHandlers();
};

/**
 * For adding html events handlers for actions with presentations
 */
Presentation.prototype.addHandlers = function () {
    $(document).on("change", this.selectors.fileInput, function (e) {
        var file = e.target.files[0];
        this.uploadPresentation(file);
    }.bind(this));
    $(document).on("click", this.selectors.showPresentation, function (e) {
        var id = $(e.target).data("id");
        this.showPresentation(id);
    }.bind(this));
    $(document).on("click", this.selectors.deletePresentation, function (e) {
        var id = $(e.target).data("id");
        this.deletePresentation(id);
    }.bind(this));
};

/**
 * For uploading of presentation
 *
 * @param {File} file
 */
Presentation.prototype.uploadPresentation = function (file) {
    var form = new FormData();
    form.append('Filename', file.name);
    form.append('conference', getInSession("meetingId"));
    form.append('room', getInSession("meetingId"));
    form.append('presentation_name', file.name);
    form.append('fileUpload', file);
    $.ajax({
        method: 'POST',
        url: '/bigbluebutton/presentation/upload',
        data: form,
        processData: false,
        contentType: false
    })
};

/**
 * For switching to presentation
 *
 * @param {string} presentationId
 */
Presentation.prototype.showPresentation = function (presentationId) {
    Meteor.call('publishShowPresentationMessage',
                presentationId,
                getInSession("meetingId"),
                getInSession('authToken'),
                getInSession("userId"));
};

/**
 * For deleting presentation
 *
 * @param presentationId
 */
Presentation.prototype.deletePresentation = function (presentationId) {
    Meteor.call('publishRemovePresentationMessage',
                presentationId,
                getInSession("meetingId"),
                getInSession('authToken'),
                getInSession("userId"));
};
$(window).on("load", function () {
    window.presentation = new Presentation();
});
