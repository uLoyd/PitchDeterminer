'use strict';

const {utils} = require("../../index");

class IAudioNode {
  settings = null;
  node = null;

  constructor(settings, defaults = {}) {
    utils.fillDefaults(settings, defaults);
    this.settings = settings;
  }

  create(context, applySettings = true) {
    return this;
  }

  applySettings(node = this.node) {
    utils.fillDefaults(node, this.settings, true);
    return this;
  }

  connectTo(node) {
    node.connect(this.node);

    return this;
  }

  connect(node) {
    this.node.connect(node);

    return this;
  }
}

module.exports = IAudioNode;
