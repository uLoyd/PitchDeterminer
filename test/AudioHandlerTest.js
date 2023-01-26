const {
  DeviceHandler,
  Device,
  AudioHandler,
  Gain,
  Analyser,
  Correlation,
} = require("../customModules/audioModules");
const assert = require("assert");
const assertion = require("./utilities/Assertion");
const testData = require("./data/AudioHandlerInitData");

describe("Audio Handler", () => {
  let audio;

  const fakeDeviceHandler = new DeviceHandler(() => {});
  fakeDeviceHandler.getFullDeviceList = function () {
    return [
      new Device(1, "test1", Device.direction.input),
      new Device(2, "test2", Device.direction.input),
      new Device(3, "test3", Device.direction.input),
      new Device(4, "test4", Device.direction.input),
      new Device(5, "test5", Device.direction.output),
      new Device(6, "test6", Device.direction.output),
      new Device(7, "test7", Device.direction.output),
      new Device(8, "test8", Device.direction.output),
    ];
  };

  const testDeviceLists = async function (direction) {
    const actualList = await audio.getDeviceList(direction);
    const expectedList = await fakeDeviceHandler
      .getFullDeviceList()
      .filter((device) => device.dir === (direction ?? device.dir));
    assert.strictEqual(actualList.length, expectedList.length);

    assertion.iterableOfObjectsPropsEqual(actualList, expectedList);
  };

  const getVolumeData = function (fillValue) {
    audio.BFDUint8 = function () {
      return new Array(256).fill(fillValue);
    };
    return audio.getVolume(0);
  };

  beforeEach(() => {
    audio = new AudioHandler({
      general: testData[0].params.general,
      gainNode: new Gain(testData[0].params.gainSettings),
      analyserNode: new Analyser(testData[0].params.analyserSettings),
    });

    audio.deviceHandler = fakeDeviceHandler;
  });

  it("Audio handler exists", () => assert.ok(audio));

  it("Audio handler Nyquist Frequency", () => {
    audio.sampleRate = 44000;
    assert.strictEqual(audio.nyquistFrequency(), 22000);
  });

  it("Audio handler creates Correlation instance", () => {
    assert.strictEqual(audio.correlation, null);
    audio.initCorrelation();
    assert.ok(audio.correlation instanceof Correlation);
  });

  it("Audio handler returns the same device list as DeviceHandler", async () => {
    await testDeviceLists();
  });

  it("Audio handler returns the same input devices as DeviceHandler", async () => {
    await testDeviceLists(Device.direction.input);
  });

  it("Audio handler returns the same output devices as DeviceHandler", async () => {
    await testDeviceLists(Device.direction.output);
  });

  it("Audio handler will not try to pause or end stream if state is not set to running", async () => {
    audio.running = false;

    await audio.pause();
    assert.ok(true);

    await audio.end();
    assert.ok(true);
  });

  it("Audio handler will try to pause if state is set to running", async () => {
    audio.running = true;
    await assertion.willThrow(audio.pause, []);
  });

  it("Audio handler will try to end stream if state is set to running", async () => {
    audio.running = true;
    await assertion.willThrow(audio.end, []);
  });

  it("Audio handler will try to resume stream if state is not set to running", async () => {
    audio.running = false;
    await assertion.willThrow(audio.resume, []);
  });

  it("Audio handler will not try to resume stream if state is set to running", async () => {
    audio.running = true;
    await audio.resume();
    assert.ok(true);
  });

  it("Audio handler will throw during stream setup if there's no available input device", async () => {
    fakeDeviceHandler.getDeviceList = function () {
      return [];
    };
    await assertion.willThrow(audio.setupStream, []);
  });

  it("Audio handler getVolume will return 1 for data with all values set to 0", () => {
    assert.strictEqual(getVolumeData(0), 1);
  });

  it("Audio handler getVolume will return 1 for data with all values set to 256", () => {
    assert.strictEqual(getVolumeData(256), 1);
  });

  it("Audio handler getVolume will return 0 for data with all values set to 128", () => {
    assert.strictEqual(getVolumeData(128), 0);
  });

  it(
    "Audio handler getWeightedVolume will return value  around 263 for A/B/C sound curves " +
      "with band range of 8Hz and linear buffer of 256 elements (0-255)",
    async () => {
      audio.BFDUint8 = function () {
        return [...Array(256).keys()];
      };
      audio.bandRange = 2048 / 256;
      const vol = audio.getWeightedVolume(2);

      assertion.isInRange(vol, 261, 264);
    }
  );
});
