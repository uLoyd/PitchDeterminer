"use strict";

function fillDefaults(target, defaults, overwrite = false) {
    for (const prop in defaults) {
        if (!target.hasOwnProperty(prop) || overwrite)
            target[prop] = defaults[prop];
    }
}

module.exports = fillDefaults;
