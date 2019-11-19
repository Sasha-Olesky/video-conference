/**
 * Global object that uses for providing i18n translations into
 * templates and scripts
 *
 * @type {Object}
 */
window.i18n = {
    translations: {}
};

/**
 * Returns translation by provided key
 *
 * @param {string} translationName - translation key
 * @return {string|null}
 */
i18n.get = function (translationName) {
    var translation = i18n.translations[translationName];
    if (translation) {
        return translation;
    } else {
        return translationName;
    }
};

/**
 * Returns translation by provided key and replaces provided placeholders
 * by provided values
 *
 * @param {string} translationName
 * @param {Object} placeholders - object in which keys are placeholders and
 *                                values is theirs replacement
 * @return {string|null}
 */
i18n.trans = function (translationName, placeholders) {
    var translation = this.get(translationName);
    if (!translation || typeof placeholders !== "object") {
        return translationName;
    }
    var result = translation;
    for (var placeholder in placeholders) {
        var value = placeholders[placeholder];
        if (placeholders.hasOwnProperty(placeholder)) {
            var regexp = new RegExp(placeholder, 'gim');
            result = result.replace(regexp, value);
        }
    }
    return result;
};

/**
 * Rerenders all templates. Need for refresh view in case when we gets
 * translations via async request to remote server.
 */
i18n.rerenderAllTemplates = function () {
    $('body').empty();
    UI.render(Template.main, document.body);
};

/**
 * For loading of provided translation
 *
 * @param {string} [locale='en'] - user preferred language
 */
i18n.getTranslations = function (locale) {
    var noCache = '?'+ new Date().getTime();
    locale = locale || "en";
    $.ajax({
        method: "GET",
        url: '/html5client/translations_' + locale + '.json'+noCache,
        success: function (data) {
            if (typeof data !== "object") {
                i18n.getTranslations();
            } else {
                i18n.translations = data;
                i18n.rerenderAllTemplates();
            }
        }
    })
};

/**
 * For getting user preferred language
 *
 * @return {string} - user locale name
 */
i18n.getUserLocale = function () {
    return BBB.getCurrentUser().userId.split("_____")[3];
};

/**
 * For fetching and rendering translations only after render of the page
 */
i18n.loadTranslations = function () {
  if(this.pageLoaded){
      return;
  }
  this.pageLoaded = true;
  i18n.getTranslations(i18n.getUserLocale());
};