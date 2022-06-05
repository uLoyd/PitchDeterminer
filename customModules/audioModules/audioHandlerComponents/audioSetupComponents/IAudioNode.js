class IAudioNode {
  settings = null;
  node = null;

  constructor(settings, defaults = {}) {
    for (const prop in defaults) {
      if (!settings.hasOwnProperty(prop)) {
        settings[prop] = defaults[prop];
      }
    }

    this.settings = settings;
  }

  create(context, applySettings = true) {
    return this;
  }

  applySettings(node = this.node) {
    for (const prop in this.settings) {
      node[prop] = this.settings[prop];
    }

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
