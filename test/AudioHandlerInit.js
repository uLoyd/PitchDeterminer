const assert = require("assert");
const {
  Analyser,
  Gain,
  AudioHandler,
  Device,
  DeviceHandler,
  Correlation,
} = require("../customModules/audioModules/index");
const testData = require("./data/AudioHandlerInitData");
require("web-audio-test-api");
const { Dweight } = require("../customModules/audioModules/weights"); // web-audio-api mock

const compObj = (value, expected) => {
  return {
    value,
    expected,
    assert: () =>
      assert.strictEqual(
        this.value,
        this.expected,
        `v:${this.value}; e:${this.expected}`
      ),
  };
};

testData.forEach(async (data) => {
  describe(`Audio Handler Initialization with params: ${data.title}`, function () {
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

    const willThrow = async function (callback, params) {
      try {
        await callback(...params);
        assert.ok(false);
      } catch (e) {
        assert.ok(true);
      }
    };

    const testDeviceLists = async function (direction) {
      const actualList = await audio.getDeviceList(direction);
      const expectedList = await fakeDeviceHandler
        .getFullDeviceList()
        .filter((device) => device.dir === (direction ?? device.dir));
      assert.strictEqual(actualList.length, expectedList.length);

      for (let i = 0; i < actualList.length; ++i) {
        assert.strictEqual(actualList[i].id, expectedList[i].id);
        assert.strictEqual(actualList[i].label, expectedList[i].label);
        assert.strictEqual(actualList[i].dir, expectedList[i].dir);
      }
    };

    before(() => {
      audio = new AudioHandler({
        general: data.params.general,
        gainNode: new Gain(data.params.gainSettings),
        analyserNode: new Analyser(data.params.analyserSettings),
      });

      audio.deviceHandler = fakeDeviceHandler;
    });

    it("Audio handler exists", () => assert.ok(audio));

    it("Audio handler buflen value", () =>
      assert.strictEqual(audio.buflen, data.compare.buflen));

    it("Audio handler sound curve algorithm instance", () =>
      assert.strictEqual(
        audio.soundCurve instanceof data.compare.soundCurve,
        true
      ));

    it("Audio handler Nyquist Frequency", () => {
      audio.sampleRate = 44000;
      assert.strictEqual(audio.nyquistFrequency(), 22000);
    });

    it("Audio handler creates Correlation instance", () => {
      assert.strictEqual(audio.correlation, null);
      audio.initCorrelation();
      assert.strictEqual(audio.correlation instanceof Correlation, true);
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
      await willThrow(audio.pause, []);
    });

    it("Audio handler will try to end stream if state is set to running", async () => {
      audio.running = true;
      await willThrow(audio.end, []);
    });

    it("Audio handler will try to resume stream if state is not set to running", async () => {
      audio.running = false;
      await willThrow(audio.resume, []);
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
      await willThrow(audio.setupStream, []);
    });

    it(
      "Audio handler getVolume will return value around 262 for A/B/C sound curves " +
        "with band range of 8Hz and linear buffer of 256 elements (0-255)",
      async () => {
        audio.BFDUint8 = function () {
          return [...Array(256).keys()];
        };
        audio.bandRange = 2048 / 256;
        const vol = audio.getVolume(2);

        if (audio.soundCurve instanceof Dweight) {
          assert.ok(true);
          return;
        }

        assert.ok(vol > 260 && vol < 264);
      }
    );

    describe("Audio Handler Analyser  Initialization", () => {
      const values = {};
      before(() => {
        const expected = data.compare;
        audio.analyser.node = {
          smoothingTimeConstant: 1,
          fftSize: 2,
          minDecibels: 3,
          maxDecibels: 4,
        };
        audio.analyser.applySettings();
        const actual = audio.analyser.node;
        values.minDecibels = compObj(actual.minDecibels, expected.minDecibels);
        values.maxDecibels = compObj(actual.maxDecibels, expected.maxDecibels);
        values.fftSize = compObj(actual.fftSize, expected.fftSize);
        values.smoothingTimeConstant = compObj(
          actual.smoothingTimeConstant,
          expected.smoothingTimeConstant
        );
      });

      it("Smoothing value", () => {
        const { smoothingTimeConstant } = values;
        smoothingTimeConstant.assert();
      });

      it("FFT Size", () => {
        const { fftSize } = values;
        fftSize.assert();
      });

      it("Min Decibels Size", () => {
        const { minDecibels } = values;
        minDecibels.assert();
      });

      it("Max Decibels Size", () => {
        const { maxDecibels } = values;
        maxDecibels.assert();
      });
    });

    describe("Audio Handler Gain  Initialization", () => {
      const values = {};
      before(() => {
        const actual = data.compare;
        audio.gain.node.gain.value = 0;
        audio.gain.applySettings();
        const expected = audio.gain.node.gain;

        values.value = compObj(actual.value, expected.value);
      });

      it("Gain value", () => {
        const { value } = values;
        value.assert();
      });
    });
  });
});
