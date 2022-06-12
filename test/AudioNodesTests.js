const assert = require("assert");
const {
  IAudioNode,
  Gain,
  Analyser,
  MediaStreamSource,
  ScriptProcessor,
  defaultAudioValues,
} = require("../customModules/audioModules");

const getTestData = () => {
  const settings = {
    x: 1,
    y: 2,
    z: 3,
    w: 4,
  };

  const defaults = {
    x: 5,
    y: 6,
    z: 7,
    q: 8,
  };

  const subDefaults = {
    q: 8,
  };

  return { settings, defaults, subDefaults };
};

const compareSettings = (actual, settings, defaults) => {
  for (const prop in settings) {
    assert.strictEqual(actual[prop], settings[prop]);
  }
  for (const prop in defaults) {
    assert.strictEqual(actual[prop], defaults[prop]);
  }
};

const checkNodeCreationWithoutAppliedSettings = (node, context) => {
  node.create(context, false);

  assert.strictEqual(node.node.x, undefined);
  assert.strictEqual(node.node.y, undefined);
  assert.strictEqual(node.node.z, undefined);
  assert.strictEqual(node.node.w, undefined);
  assert.strictEqual(node.node.q, undefined);
};

describe(`IAudioNode`, () => {
  let node;
  const { settings, defaults, subDefaults } = getTestData();

  before(() => {
    node = new IAudioNode(settings, defaults);
    node.node = { connect: () => {} };
  });

  it("constructor without defaults will save settings as they are", () => {
    const defaultNode = new IAudioNode(settings);
    compareSettings(defaultNode.settings, settings, settings);
  });

  it("constructor assigns settings correctly", () => {
    compareSettings(node.settings, settings, subDefaults);
  });

  it("applySettings applies settings to node", () => {
    node.applySettings();

    compareSettings(node.node, settings, subDefaults);
  });

  it("is an interface... not much to test here, but hey, coverage", () => {
    assert.deepStrictEqual(node, node.create());
    assert.deepStrictEqual(node, node.connectTo(node));
  });
});

describe(`GainNode`, () => {
  let node;
  const { settings } = getTestData();
  const context = {
    createGain: () => {
      return { gain: {} };
    },
  };

  before(() => {
    node = new Gain(settings);
    node.node = { gain: 5 };
  });

  it("constructor without settings will fill them with default values", () => {
    const defaultNode = new Gain();
    const nodeDefaults = defaultAudioValues.audioSetup.gain;
    compareSettings(defaultNode.settings, nodeDefaults, nodeDefaults);
  });

  it("create method does not apply settings to node if not requested", () => {
    node.create(context, false);
    checkNodeCreationWithoutAppliedSettings(node, context);
  });

  it("create method applies settings to node by default", () => {
    node.create(context);
    compareSettings(
      node.node.gain,
      settings,
      defaultAudioValues.audioSetup.gain
    );
  });
});

describe(`AnalyserNode`, () => {
  let node;
  const { settings } = getTestData();
  const context = {
    createAnalyser: () => {
      return {};
    },
  };

  before(() => {
    node = new Analyser(settings);
    node.node = {};
  });

  it("constructor without settings will fill them with default values", () => {
    const defaultNode = new Analyser();
    const nodeDefaults = defaultAudioValues.audioSetup.analyser;
    compareSettings(defaultNode.settings, nodeDefaults, nodeDefaults);
  });

  it("create method does not apply settings to node if not requested", () => {
    checkNodeCreationWithoutAppliedSettings(node, context);
    node.create(context, false);
  });

  it("create method applies settings to node by default", () => {
    node.create(context);
    compareSettings(
      node.node,
      settings,
      defaultAudioValues.audioSetup.analyser
    );
  });
});

describe(`MediaStreamSource`, () => {
  let node;
  const { settings, defaults, subDefaults } = getTestData();
  const context = {
    createMediaStreamSource: () => {
      return {};
    },
  };

  before(() => {
    node = new MediaStreamSource(settings, defaults);
    node.node = {};
  });

  it("create method does not apply settings to node by default", () => {
    node.create(context, null);
    checkNodeCreationWithoutAppliedSettings(node, context);
  });

  it("create method applies settings to node if requested", () => {
    node.create(context, null, true);
    compareSettings(node.node, settings, subDefaults);
  });
});

describe(`ScriptProcessor`, () => {
  let node;
  const { settings, defaults, subDefaults } = getTestData();
  const context = {
    createScriptProcessor: () => {
      return {};
    },
  };

  before(() => {
    node = new ScriptProcessor(settings, defaults);
    node.node = {};
  });

  it("create method does not apply settings to node by default", () => {
    node.create(context);
    checkNodeCreationWithoutAppliedSettings(node, context);
  });

  it("create method applies settings to node if requested", () => {
    node.create(context, true);
    compareSettings(node.node, settings, subDefaults);
  });
});
