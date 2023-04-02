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
const NavigatorMock = require("./utilities/NavigatorMock");
const fakeDeviceList = require("./utilities/FakeDeviceList");
const testData = require("./data/AudioHandlerInitData");
const { AudioEvents } = require("../customModules/audioModules/index");

describe("Audio Handler", () => {
  let audio;

  const testDeviceLists = async function (direction) {
    const actualList = await audio.getDeviceList(direction);
    const expectedList = (await audio.deviceHandler.getFullDeviceList()).filter(
      (device) => device.dir === (direction ?? device.dir)
    );
    assert.strictEqual(actualList.length, expectedList.length);

    assertion.iterableOfObjectsPropsEqual(actualList, expectedList);
  };

  const getVolumeData = function (fillValue) {
    audio.BFDUint8 = function () {
      return new Array(256).fill(fillValue);
    };
    return audio.getVolume(0);
  };

  const navigatorMock = NavigatorMock.setMockDevices(fakeDeviceList);

  beforeEach(() => {
    audio = new AudioHandler({
      general: testData[0].params.general,
      gainNode: new Gain(testData[0].params.gainSettings),
      analyserNode: new Analyser(testData[0].params.analyserSettings),
    });

    audio.navigator = navigatorMock;
    audio.deviceHandler.navigator = navigatorMock;
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
    audio.deviceHandler.navigator = NavigatorMock.setMockDevices([]);
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

  it("Audio handler should call navigator.mediaDevices.getUserMedia with constraint from Device handler if input device is present", async () => {
    const fakeDeviceList = [new Device(1, "test1", Device.direction.input)];

    audio.navigator = NavigatorMock.setMockDevices(fakeDeviceList);
    audio.deviceHandler = new DeviceHandler();
    audio.deviceHandler.navigator =
      NavigatorMock.setMockDevices(fakeDeviceList);
    await audio.deviceHandler.updateDeviceList();
    let constraint = await audio.getMediaStream();
    assert.strictEqual(constraint.audio.deviceId.exact, fakeDeviceList[0].id);
    assert.strictEqual(constraint.video, false);
  });

  it("Audio handler should call navigator.mediaDevices.getUserMedia with undefined from Device handler if input device is not present", async () => {
    audio.navigator = NavigatorMock.setMockDevices([]);
    audio.deviceHandler = new DeviceHandler();
    audio.deviceHandler.navigator = NavigatorMock.setMockDevices([]);
    console.log(audio.deviceHandler.navigator.mediaDevices.enumerateDevices());
    let constraint = await audio.getMediaStream();
    assert.strictEqual(constraint.audio.deviceId, undefined);
    assert.strictEqual(constraint.video, false);
  });

  it("Audio handler will emit SetupDone event after setupStream call", async () => {
    const fakeDeviceList = [new Device(1, "test1", Device.direction.input)];
    audio.navigator = NavigatorMock.setMockDevices(fakeDeviceList);
    audio.deviceHandler = new DeviceHandler();
    audio.deviceHandler.navigator =
      NavigatorMock.setMockDevices(fakeDeviceList);
    audio.audioContext.createMediaStreamSource = () => {};
    audio.audioContext.createScriptProcessor = () => {};
    audio.streamSetup = () => {};

    await assertion.willTriggerEvent(
      audio,
      AudioEvents.setupDone,
      audio.setupStream.bind(audio)
    );
  });

  it("Audio Handler will unset stream, running to false and streamReady to false on end call if it's running", async () => {
    audio.running = true;
    audio.streamClose = () => {};
    await audio.end();

    assert.ok(!audio.stream);
    assert.ok(!audio.running);
    assert.ok(!audio.streamReady);
  });

  it("Audio Handler will call streamEnd event after end call if it's currently running", async () => {
    audio.running = true;
    audio.streamClose = () => {};

    await assertion.willTriggerEvent(
      audio,
      AudioEvents.streamEnd,
      audio.end.bind(audio)
    );
    assert.ok(!audio.running);
  });

  it("Audio Handler will call streamPause event after pause call if it's currently running", async () => {
    audio.running = true;
    audio.streamPause = () => {};

    await assertion.willTriggerEvent(
      audio,
      AudioEvents.streamPause,
      audio.pause.bind(audio)
    );
    assert.ok(!audio.running);
  });

  it("Audio Handler will call streamResume event after resume call if it's currently not running", async () => {
    audio.running = false;
    audio.streamResume = () => {};

    await assertion.willTriggerEvent(
      audio,
      AudioEvents.streamResume,
      audio.resume.bind(audio)
    );
    assert.ok(audio.running);
  });

  it("AUdio Handler will call Correlation.perform on correlate call", () => {
    let callFlag = false;
    audio.FTDFloat32 = () => {};
    audio.correlation = {
      perform: function () {
        callFlag = true;
      },
    };
    audio.correlate();
    assert.ok(callFlag);
  });
});
