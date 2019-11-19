/**
 * Pseudo-class for drawing figures on whiteboard
 *
 * @constructor
 */
function Drawer() {
    this.selectors = {
        whiteboard: "#whiteboard-paper",
        drawControls: ".presenter-drawer-control",
        colorPicker: ".js-drawer-colorpicker",
        thicknessPicker: ".js-drawer-thicknesspicker",
        undo: ".js-draw-undo",
        clean: ".js-draw-clean",
        controlBaseSelector: ".js-draw"
    };
    this.elementsClassNames = {
        activeControl: "active-control",
        textbox: 'js-textbox',
        textboxTextarea: 'js-textbox-textarea',
        textboxColor: "js-textbox-color",
        textboxFontsize: "js-textbox-fontsize"
    };

    // statuses which we send to the server
    // with shape
    this.shapeStatuses = {
        CREATE: "DRAW_START",
        UPDATE: "DRAW_UPDATE",
        FINISH: "DRAW_END"
    };
    // statuses which we send to the server
    // with text
    this.textStatuses = {
        CREATE: "textCreated",
        UPDATE: "textEdited",
        FINISH: "textPublished"
    };
    this.buttonCodes = {
        MOUSE_LEFT_BUTTON: 1
    };

    this.toolTypes = {
        TRIANGLE: "triangle",
        RECTANGLE: "rectangle",
        HAND: "hand",
        ELLIPSE: "ellipse",
        LINE: "line",
        PENCIL: "pencil",
        TEXT: "text"
    };
    //selectors for buttons which enables drawing of some shape
    this.shapeControlsSelectors = {};
    //prefix for a classes that will be generated for existing tool types from this.toolTypes
    //and will used for handling drawing controls events
    this.shapeControlSelectorPrefix = ".js-draw-";


    //by default Hand tool is enabled
    this.currentTool = this.toolTypes.HAND;

    // how much times we sends cursor position
    // to server per second
    this.cursorMovesPerSecond = 30;

    this.currentShapeStatus = undefined;
    this.currentTextStatus = undefined;
    this.pencilPath = [];

    // responsible for color of drawing shape
    // server needs a decimal number, so we need to convert hex
    // color number to decimal
    this.currentColor = 0;
    // responsible for color of drawing text, also needs decimal color number
    this.fontColor = 0;

    this.currentThickness = 1;
    this.currentZoomRatio = 100;
    this.zoomStep = 5;
    this.maxZoomIn = 20;
    this.maxZoomOut = 100;
    this.zoomOffsetX = 0;
    this.zoomOffsetY = 0;
    this.startTextboxX = 0;
    this.startTextboxY = 0;
    this.textBoxWidth = 0;
    this.textBoxHeight = 0;
    this.textBoxText = "";
    this.defaultTextBoxFontSize = 18;
    this.textBoxFontSizes = [12, 14, 16, 18, 20, 22, 24, 32, 36];
    this.textBoxFontSize = this.defaultTextBoxFontSize;

    // need for calculation of textarea right padding and lineheight
    // depends on font size for compliance with text drawing
    this.rightPaddingToFontSizeRatio = 0.2;
    this.lineHeightToFontSizeRatio = 1.16;

    //template for textbox that appears when we use Text tool
    this.textBoxTemplate = $('\
    <div class="textbox ' + this.elementsClassNames.textbox + '">\
        <div class="textbox-control">\
            <input title="Font color" class="textbox-color ' + this.elementsClassNames.textboxColor + '" type="color">\
            <select title="Font size" class="textbox-fontsize '+ this.elementsClassNames.textboxFontsize +'">\
            </select>\
        </div>\
        <textarea class="textbox-textarea ' + this.elementsClassNames.textboxTextarea + '"></textarea>\
    </div>\
        ')[0].outerHTML;
    this.rangeSliderScriptSrc = "/html5client/rangeslider/ion.rangeSlider.min.js";

    this.init();
}

/**
 * For instant initialization
 */
Drawer.prototype.init = function () {
    this.initCustomRangeSlider();
    this.generateShapeControlsSelectors();
    this.getZoomData();
    this.initControlsToggler();
    this.initMoveCursorHandler();
    this.initDrawShapeHandler();
    this.renderControlsState();
    this.initControlsEvents();
    this.initColorPickerChangesHandler();
    this.initUndoActionHandler();
    this.initCleanActionHandler();
    this.initThicknessPickerChangesHandler();
    this.initResizeAndMoveSlideHandlers();
    this.initDrawTextHandlers();
    this.initDrawTextControlsHandlers();
};
/**
 * For generating shape controls selectors that depends on provided class prefix and
 * shape tools names
 */
Drawer.prototype.generateShapeControlsSelectors = function () {
    for(var toolType in this.toolTypes) {
        if(this.toolTypes.hasOwnProperty(toolType)) {
            var toolName = this.toolTypes[toolType];
            this.shapeControlsSelectors[toolName] = this.shapeControlSelectorPrefix + toolName;
        }
    }
};

/**
 * For getting textbox element from template with generated font size options
 */
Drawer.prototype.getTextboxElement = function () {
    if(this.textBoxFontSizes.indexOf(this.defaultTextBoxFontSize) === -1) {
        this.textBoxFontSizes.push(this.defaultTextBoxFontSize);
    }
    this.textBoxFontSizes = this.textBoxFontSizes.sort(function (a, b) {
        return a > b;
    });
    var options = '';
    this.textBoxFontSizes.forEach(function (fontSize) {
        var option = $('<option></option>');
        option.attr({
            selected: fontSize == this.defaultTextBoxFontSize
        });
        option.val(fontSize);
        option.html(fontSize);
        options += option[0].outerHTML;
    }.bind(this));
    var elemHTML = $(this.textBoxTemplate);
    elemHTML.find("."+this.elementsClassNames.textboxFontsize).html(options);
    return elemHTML;
};

/**
 * Converts hex color into decimal
 *
 * @param {string} hex
 * @return {Number} - decimal number
 */
Drawer.prototype.hexToDecimal = function (hex) {
  hex = hex.replace('#', '');
  return parseInt(hex, 16);
};
/**
 * Handlers for changing font-size and font-color of Text tool
 */
Drawer.prototype.initDrawTextControlsHandlers = function () {
    var _this = this;
    $(document).on("change", "."+this.elementsClassNames.textboxColor, function () {
        var hexcolor = $(this).val();
        _this.fontColor = _this.hexToDecimal(hexcolor);
        _this.setTextboxTextareaStyles();
        _this.drawText(_this.textStatuses.UPDATE);
    });
    $(document).on("change", "."+this.elementsClassNames.textboxFontsize, function () {
        _this.textBoxFontSize = +$(this).val();
        _this.setTextboxTextareaStyles();
        _this.drawText(_this.textStatuses.UPDATE);
    });
};

/**
 * Need for style compliance between current Text tool variables and
 * text displayed in textbox textarea
 */
Drawer.prototype.setTextboxTextareaStyles = function () {
    if(!this.textboxTextarea.length){
        return;
    }
    var zoomedFontSize =  this.textBoxFontSize / (this.currentZoomRatio / 100);
    var lineHeight = zoomedFontSize * this.lineHeightToFontSizeRatio;
    var rightPadding = zoomedFontSize * this.rightPaddingToFontSizeRatio;
    var color = "#"+(this.fontColor).toString(16);
    this.textboxTextarea.css({
        fontSize:zoomedFontSize,
        lineHeight: lineHeight+"px",
        paddingRight: rightPadding,
        color: color
    });
};

/**
 * Handlers for creating Text tool textbox, for it resizing
 * and removing
 */
Drawer.prototype.initDrawTextHandlers = function () {
    var _this = this;
    $(document).on("mousedown", this.selectors.whiteboard, function (e) {
        if (e.which !== _this.buttonCodes.MOUSE_LEFT_BUTTON) {
            return;
        }
        if (_this.currentTool !== _this.toolTypes.TEXT) {
            return;
        }
        if (_this.activeTextbox) {
            return;
        }
        _this.activeTextbox = true;
        $(document).on("mousemove", resizeTextBox);
        $(document).on("mouseup", stopResizeTextBox);
        _this.textbox = _this.getTextboxElement().appendTo($("body"));
        _this.textboxTextarea = _this.textbox.find('.' + _this.elementsClassNames.textboxTextarea);
        var x = e.pageX;
        var y = e.pageY;
        _this.textbox.css({top: y, left: x});

        _this.setTextboxTextareaStyles();
        _this.startTextboxX = _this.getAbsoluteXCoordinate(_this.xPercent);
        _this.startTextboxY = _this.getAbsoluteYCoordinate(_this.yPercent);

        _this.generateNewShapeId();
        _this.drawText(_this.textStatuses.CREATE);

        /**
         * For textbox resizing until user presses mouse left button
         * @param {Object} e
         */
        function resizeTextBox(e) {
            var newWidth = e.pageX - x;
            var newHeight = e.pageY - y;
            _this.getWhiteboardDimensions();
            if(x + newWidth > _this.whiteboardX + _this.whiteboardWidth){
                newWidth = _this.whiteboardWidth - (x - _this.whiteboardX);
            }
            if(y + newHeight > _this.whiteboardY + _this.whiteboardHeight){
                newHeight = _this.whiteboardHeight - (y - _this.whiteboardY);
            }
            _this.textboxTextarea.css({width: newWidth, height: newHeight});
        }

        /**
         * After user stop pressing mouse left button, we add handlers for sending
         * actual text to the server and finishing operation after user clicks outside
         * from textbox
         */
        function stopResizeTextBox() {
            _this.textboxTextarea.focus();

            _this.textBoxWidth = _this.getAbsoluteXCoordinate(_this.xPercent) - _this.startTextboxX;
            _this.textBoxHeight = _this.getAbsoluteXCoordinate(_this.yPercent) - _this.startTextboxY;

            _this.drawText(_this.textStatuses.UPDATE);

            $(document).on("mousedown", finishTextDrawing);
            $(document).off("mousemove", resizeTextBox);
            $(document).off("mouseup", stopResizeTextBox);
            _this.textboxTextarea.on("keyup", enterText)
        }

        /**
         * Gets actual text from textbox
         */
        function enterText() {
            _this.textBoxText = $(this).val();
            _this.drawText(_this.textStatuses.UPDATE);
        }

        /**
         * For sending finish data to server after end of editing.
         * Removes textbox and removes unnecessary events. Resets Text tool state.
         *
         * @param {Object} e
         */
        function finishTextDrawing(e) {
            if ($(e.target).closest("."+_this.elementsClassNames.textbox).length) {
                return;
            }
            _this.drawText(_this.textStatuses.FINISH);
            _this.resetTextboxVars();
            _this.textbox.remove();
            _this.activeTextbox = false;
            $(document).off("mousedown", finishTextDrawing);
            _this.textboxTextarea.off("keyup", enterText);
        }
    })
};

/**
 * For resetting Text tool variables after submission of result
 */
Drawer.prototype.resetTextboxVars = function () {
    this.startTextboxX = 0;
    this.startTextboxY = 0;
    this.textBoxWidth = 0;
    this.textBoxHeight = 0;
    this.textBoxText = "";
    this.textBoxFontSize = this.defaultTextBoxFontSize;
    this.fontColor = 0;
    this.currentTextStatus = undefined;
};

/**
 * For sending current text shape to the server
 *
 * @param {string} statusCode - drawing status from this.textStatuses
 */
Drawer.prototype.drawText = function (statusCode) {
    this.currentTextStatus = statusCode;
    var annotation = {
        type: this.currentTool,
        status: this.currentTextStatus,
        whiteboardId: this.getWhiteboardId(),
        id: this.shapeId,
        calcedFontSize: this.textBoxFontSize / this.whiteboardHeight * 100,
        dataPoints: this.startTextboxX+","+this.startTextboxY,
        fontColor: this.fontColor,
        fontSize:  this.textBoxFontSize,
        text: this.textBoxText,
        textBoxHeight: this.textBoxHeight,
        textBoxWidth: this.textBoxWidth,
        x: this.startTextboxX,
        y: this.startTextboxY
    };
    //noinspection JSUnresolvedVariable
    Meteor.call("shareShapeMessage",
        annotation,
        getInSession('meetingId'),
        getInSession('userId'),
        getInSession('authToken'));
};

/**
 * For getting current whiteboardId
 * @return {string} - whiteboardId
 */
Drawer.prototype.getWhiteboardId = function () {
    var currentSlide = BBB.getCurrentSlide();
    return currentSlide.presentationId + '/' + currentSlide.slide.num;
};

/**
 * Handler for undo previous shape drawing
 */
Drawer.prototype.initUndoActionHandler = function () {
    var _this = this;
    $(document).on("click", this.selectors.undo, function () {
        _this.undoDrawing();
    })
};

/**
 * For sending undo command to the server
 */
Drawer.prototype.undoDrawing = function () {
    //noinspection JSUnresolvedVariable
    Meteor.call("undoShapeMessage",
        this.getWhiteboardId(),
        getInSession('meetingId'),
        getInSession('userId'),
        getInSession('authToken'));
};

/**
 * Handler for clearing current whiteboard from shapes
 */
Drawer.prototype.initCleanActionHandler = function () {
    var _this = this;
    $(document).on("click", this.selectors.clean, function () {
        _this.cleanDrawing();
    });
};

/**
 * For sending clear whiteboard comand to the server
 */
Drawer.prototype.cleanDrawing = function () {
    //noinspection JSUnresolvedVariable
    Meteor.call("cleanWhiteboardMessage",
        this.getWhiteboardId(),
        getInSession('meetingId'),
        getInSession('userId'),
        getInSession('authToken'));
};

/**
 * Handler for switching between drawing tools
 */
Drawer.prototype.initControlsEvents = function () {
    var _this = this;
    $(document).on('click', this.selectors.controlBaseSelector, function () {
        var target = $(this);
        if (target.hasClass(_this.elementsClassNames.activeControl)) {
            return;
        }
        var controlType = target.data('type');
        if (!controlType || !_this.shapeControlsSelectors[controlType]) {
            return;
        }
        if (_this.currentShapeStatus && _this.currentShapeStatus !== _this.shapeStatuses.FINISH) {
            _this.drawShape(_this.shapeStatuses.FINISH);
        }
        _this.currentTool = controlType;
        _this.renderControlsState();
    });
};

/**
 * For handling changes of current drawing color from colorpicker
 */
Drawer.prototype.initColorPickerChangesHandler = function () {
    var _this = this;
    $(document).on('change', this.selectors.colorPicker, function () {
        var hexColor = $(this).val();
        _this.currentColor = _this.hexToDecimal(hexColor);
    })
};

/**
 * For handling changes of current drawing line thickness from thickness
 * range input
 */
Drawer.prototype.initThicknessPickerChangesHandler = function () {
    var _this = this;
    $(document).on('change', this.selectors.thicknessPicker, function () {
        _this.currentThickness = $(this).val();
    });
};

/**
 * Replaces native input type="range" by custom one. Needs because in firefox
 * input type range doesn't work properly.
 */
Drawer.prototype.initCustomRangeSlider = function () {
    var thicknessPicker = $(this.selectors.thicknessPicker);
    $.getScript(this.rangeSliderScriptSrc, function () {
        $(this.selectors.thicknessPicker).ionRangeSlider({
            type: 'single',
            hide_min_max: true,
            hide_from_to: true,
            min: thicknessPicker.attr("min"),
            max: thicknessPicker.attr("max")
        });
    }.bind(this));
};

/**
 * For refreshing data about whiteboard zoom state
 */
Drawer.prototype.getZoomData = function () {
    var slide = BBB.getCurrentSlide().slide;
    this.currentZoomRatio = slide.width_ratio;
    this.zoomOffsetX = slide.x_offset;
    this.zoomOffsetY = slide.y_offset;
};

/**
 * For highlighting current tool in control panel and remove highlighting from previous
 */
Drawer.prototype.renderControlsState = function () {
    for (var type in this.shapeControlsSelectors) {
        if (this.shapeControlsSelectors.hasOwnProperty(type)) {
            $(this.shapeControlsSelectors[type]).removeClass(this.elementsClassNames.activeControl);
        }
    }
    $(this.shapeControlsSelectors[this.currentTool]).addClass(this.elementsClassNames.activeControl);
};

/**
 * For getting actual size of whiteboard that needed for correct cursor position calculation
 */
Drawer.prototype.getWhiteboardDimensions = function () {
    this.whiteboard = this.whiteboard || $(this.selectors.whiteboard);
    this.whiteboardX = this.whiteboard.offset().left;
    this.whiteboardY = this.whiteboard.offset().top;
    this.whiteboardWidth = this.whiteboard.outerWidth();
    this.whiteboardHeight = this.whiteboard.outerHeight();
};

/**
 * Handlers for zoom and moving of zoomed whiteboard
 */
Drawer.prototype.initResizeAndMoveSlideHandlers = function () {
    var _this = this;
    $(document).on("mousewheel", this.selectors.whiteboard, function (e) {
        e.preventDefault();
        var zoomDirection = e.originalEvent.deltaY > 0 ? 1 : -1;
        _this.currentZoomRatio = (_this.zoomStep * zoomDirection) + _this.currentZoomRatio;
        if (_this.currentZoomRatio > _this.maxZoomOut) {
            _this.currentZoomRatio = _this.maxZoomOut;
            return;
        }
        if (_this.currentZoomRatio < _this.maxZoomIn) {
            _this.currentZoomRatio = _this.maxZoomIn;
            return;
        }
        _this.calculateZoomOffsets();
        _this.resizeAndMoveSlide();
    });
    $(document).on("mousedown", this.selectors.whiteboard, function (e) {
        if (e.which !== _this.buttonCodes.MOUSE_LEFT_BUTTON) {
            return;
        }
        if (_this.currentTool !== _this.toolTypes.HAND) {
            return;
        }
        $(document).on("mousemove", moveSlide);
        $(document).on("mouseup", cancelHandlers);
        var startMoveSlideX = _this.xPercent;
        var startMoveSlideY = _this.yPercent;

        /**
         * For slide moving depend on mouse direction
         */
        function moveSlide() {
            var diffX = (_this.xPercent - startMoveSlideX) * _this.currentZoomRatio;
            var diffY = (_this.yPercent - startMoveSlideY) * _this.currentZoomRatio;
            _this.zoomOffsetX += diffX;
            _this.zoomOffsetY += diffY;
            if (_this.zoomOffsetX * 2 - _this.currentZoomRatio <= -100) {
                _this.zoomOffsetX = (_this.currentZoomRatio - 100) / 2;
            }
            if (_this.zoomOffsetX >= 0) {
                _this.zoomOffsetX = 0;
            }
            if (_this.zoomOffsetY * 2 - _this.currentZoomRatio <= -100) {
                _this.zoomOffsetY = (_this.currentZoomRatio - 100) / 2;
            }
            if (_this.zoomOffsetY >= 0) {
                _this.zoomOffsetY = 0;
            }
            startMoveSlideX = _this.xPercent;
            startMoveSlideY = _this.yPercent;
            _this.resizeAndMoveSlide();
        }

        /**
         * Fot events disabling after end of operation
         */
        function cancelHandlers() {
            $(document).off("mousemove", moveSlide);
            $(document).off("mouseup", cancelHandlers);
        }
    })
};

/**
 * For calculating zoom offsets depends on zoom size and cursor position
 */
Drawer.prototype.calculateZoomOffsets = function () {
    this.zoomOffsetX = ((this.currentZoomRatio - 100) / 2) * this.xPercent;
    this.zoomOffsetY = ((this.currentZoomRatio - 100) / 2) * this.yPercent;
};


/**
 * For getting absolute x coordinate depends on zoom size, zoom offset and provided
 * cursor x position relative to zoomed viewport
 * @param {number} relativeX
 * @return {number}
 */
Drawer.prototype.getAbsoluteXCoordinate = function (relativeX) {
    this.getZoomData();
    return -this.zoomOffsetX * 2 + (relativeX * this.currentZoomRatio);
};

/**
 * For getting absolute y coordinate depends on zoom size, zoom offset and provided
 * cursor y position relative to zoomed viewport
 * @param {number} relativeY
 * @return {number}
 */
Drawer.prototype.getAbsoluteYCoordinate = function (relativeY) {
    this.getZoomData();
    return -this.zoomOffsetY * 2 + (relativeY * this.currentZoomRatio);
};

/**
 * For sending to server resize and move slide command
 */
Drawer.prototype.resizeAndMoveSlide = function () {
    //noinspection JSUnresolvedVariable
    Meteor.call("resizeAndMoveSlideMessage",
        this.zoomOffsetX,
        this.zoomOffsetY,
        this.currentZoomRatio,
        this.currentZoomRatio,
        getInSession('meetingId'),
        getInSession('userId'),
        getInSession('authToken'));
};

/**
 * Fot generating new unique shape id
 */
Drawer.prototype.generateNewShapeId = function () {
    this.shapeId = getInSession('userId') + "-" + new Date().getTime() + "-" + Math.random()*1e5;
};

/**
 * Handler for getting actual cursor position on whiteboard
 */
Drawer.prototype.initMoveCursorHandler = function () {
    $(document).on('dragstart', function (e) {
        e.preventDefault();
    });
    $(document).on("mousemove", this.selectors.whiteboard, this.moveCursorHandler.bind(this));
};

/**
 * For adding html events handlers relative to whiteboard controls
 */
Drawer.prototype.initDrawShapeHandler = function () {

    $(document).on("mousedown", this.selectors.whiteboard, function (e) {
        if (e.which !== this.buttonCodes.MOUSE_LEFT_BUTTON) {
            return;
        }
        if (!this.currentTool || this.currentTool == this.toolTypes.HAND || this.currentTool == this.toolTypes.TEXT) {
            return;
        }
        var _this = this;
        this.xStartPercent = this.getAbsoluteXCoordinate(this.xPercent);
        this.yStartPercent = this.getAbsoluteYCoordinate(this.yPercent);
        this.generateNewShapeId();
        this.drawShape(this.shapeStatuses.CREATE);
        $(document).on("mousemove", drawShape);
        $(document).on("mouseup", endDrawing);

        /**
         * For sending current shape state to the server and serving path fot pencil tool
         */
        function drawShape() {
            if (_this.currentTool === _this.toolTypes.PENCIL) {
                _this.pencilPath.push(_this.getAbsoluteXCoordinate(_this.xPercent));
                _this.pencilPath.push(_this.getAbsoluteYCoordinate(_this.yPercent));
            }
            _this.drawShape(_this.shapeStatuses.UPDATE);
        }

        /**
         * For sending to server finish state of the shape. Disables
         * unnecessary events.
         */
        function endDrawing() {
            $(document).off("mousemove", drawShape);
            $(document).off("mouseup", endDrawing);
            _this.drawShape(_this.shapeStatuses.FINISH);
            _this.pencilPath = [];
        }
    }.bind(this));
};

/**
 * For showing drawing controls only when user hovers it
 */
Drawer.prototype.initControlsToggler = function () {
    var _this = this;
    $(document).on("mouseenter", this.selectors.drawControls, function () {
        $(_this.selectors.drawControls).animate({opacity: 1, top: 0}, 100);
    });
    $(document).on("mouseleave", this.selectors.drawControls, function () {
        $(_this.selectors.drawControls).animate({opacity: 0, top: -20}, 100);
    });
};

/**
 * For calculation of cursor movement coordinates
 *
 * @param e
 */
Drawer.prototype.moveCursorHandler = function (e) {
    if (this.lastMoveCursorTime
        && new Date().getTime() - this.lastMoveCursorTime < 1000 / this.cursorMovesPerSecond) {
        return;
    }
    this.getWhiteboardDimensions();
    this.lastMoveCursorTime = new Date().getTime();
    this.x = e.pageX - this.whiteboardX;
    this.y = e.pageY - this.whiteboardY;
    this.xPercent = this.x / this.whiteboardWidth;
    this.yPercent = this.y / this.whiteboardHeight;
    this.shareCursorPosition(this.xPercent, this.yPercent);
};

/**
 * For getting array of points needed for shape drawing. All shapes
 * needs 2 points except pencil.
 *
 * @return {[number..]}
 */
Drawer.prototype.getShapePoints = function () {
    var points = [];
    if (this.currentTool === this.toolTypes.PENCIL) {
        points = points.concat([this.xStartPercent, this.yStartPercent]);
        if (this.pencilPath.length) {
            points = points.concat(this.pencilPath);
        }
        points = points.concat([this.getAbsoluteXCoordinate(this.xPercent), this.getAbsoluteYCoordinate(this.yPercent)]);
    } else {
        points = [this.xStartPercent, this.yStartPercent, this.getAbsoluteXCoordinate(this.xPercent), this.getAbsoluteYCoordinate(this.yPercent)]
    }
    return points;
};

/**
 * For sending current shape to the server
 *
 * @param {string} statusCode - drawing status from this.shapeStatuses
 */
Drawer.prototype.drawShape = function (statusCode) {
    this.currentShapeStatus = statusCode;
    var annotation = {
        type: this.currentTool,
        status: this.currentShapeStatus,
        points: this.getShapePoints(),
        color: this.currentColor,
        thickness: this.currentThickness,
        transparency: false,
        whiteboardId: this.getWhiteboardId(),
        id: this.shapeId
    };
    //noinspection JSUnresolvedVariable
    Meteor.call("shareShapeMessage",
        annotation,
        getInSession('meetingId'),
        getInSession('userId'),
        getInSession('authToken'));
};

/**
 * For sending cursor position to server
 *
 * @param {number} x
 * @param {number} y
 */
Drawer.prototype.shareCursorPosition = function (x, y) {
    //noinspection JSUnresolvedVariable
    Meteor.call("shareCursorPositionMessage",
        x,
        y,
        getInSession('meetingId'),
        getInSession('userId'),
        getInSession('authToken'))
};

window.Drawer = Drawer;
