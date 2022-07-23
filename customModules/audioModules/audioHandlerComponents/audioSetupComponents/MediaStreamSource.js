'use strict';

const IAudioNode = require("./IAudioNode");

class MediaStreamSource extends IAudioNode {
  constructor(settings, defaults) {
    super(settings, defaults);
  }

  create(context, params, applySettings = false) {
    this.node = context.createMediaStreamSource(params);

    if (applySettings) super.applySettings();

    return this;
  }
}

module.exports = MediaStreamSource;
