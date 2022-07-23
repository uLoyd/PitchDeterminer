"use strict";

const IAudioNode = require("./IAudioNode");

class ScriptProcessor extends IAudioNode {
  constructor(settings, defaults) {
    super(settings, defaults);
  }

  create(context, applySettings = false) {
    this.node = context.createScriptProcessor();

    if (applySettings) super.applySettings();

    return this;
  }
}

module.exports = ScriptProcessor;
