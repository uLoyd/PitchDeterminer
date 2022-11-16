const assert = require("assert");
const assertion = require("./utilities/Assertion");
const {
  Analyser,
  Gain,
  AudioFileHandler,
  AudioEvents,
} = require("../customModules/audioModules/index");
const testData = require("./data/AudioHandlerInitData")[0];
require("web-audio-test-api");
const { Correlation } = require("../customModules/audioModules");

describe(`Audio File Handler`, function () {
  let audio;

  const fakeDecode = function (callback) {
    return {
      getChannelData: (data) => {
        return [0, 1, 2, 3, 4];
      },
      sampleRate: 44000,
    };
  };

  const assertProcessOutput = function (expected, actual) {
    assert.strictEqual(expected.length, actual.length);
    assertion.iterableStrictEqual(actual, expected);
  };

  beforeEach(() => {
    audio = new AudioFileHandler(
      {
        general: testData.params.general,
        gainNode: new Gain(testData.params.gainSettings),
        analyserNode: new Analyser(testData.params.analyserSettings),
      },
      "notExistingFile.wav"
    );

    audio.decode = fakeDecode;
    audio.buflen = 4096;
  });

  it("getPCMData returns data Object and PCM as array when initial data is passed", async () => {
    const { data, pcm } = await audio.getPCMData(fakeDecode(), null);
    assert.ok(data instanceof Object);
    assert.ok(pcm instanceof Array);
  });

  it("getPCMData returns data Object and PCM as array when initial data is not passed", async () => {
    const { data, pcm } = await audio.getPCMData(null, null);
    assert.ok(data instanceof Object);
    assert.ok(pcm instanceof Array);
  });

  it("process will call action 5 times for array of 5 elements and buffer of 1", () => {
    const expectedOutput = [0, 1, 2, 3, 4];
    const output = [];

    const callback = (chunk) => {
      assert.strictEqual(chunk.length, 5);
      output.push(...chunk);
    };

    audio.process([...expectedOutput], callback);

    assertProcessOutput(expectedOutput, output);
  });

  it("processCallback will call action once for array of 5 elements and buffer of 4096", async () => {
    const expectedOutput = [0, 1, 2, 3, 4];
    const output = [];

    const callback = (chunk) => {
      assert.strictEqual(chunk.length, 5);
      output.push(...chunk);
    };

    await audio.processCallback(callback);

    assertProcessOutput(expectedOutput, output);
  });

  it("processEvent will call action once for array of 5 elements and buffer of 4096", async () => {
    const expectedOutput = [0, 1, 2, 3, 4];
    const output = [];

    audio.on(AudioEvents.processedFileChunk, (chunk) => {
      assert.strictEqual(chunk.length, 5);
      output.push(...chunk);
    });

    await audio.processEvent();

    assertProcessOutput(expectedOutput, output);
  });

  it("createSource will return output of AudioContext.createBufferSource", async () => {
    const fakeObj = {
      buffer: 0,
      connect: () => {},
    };

    audio.audioContext = {
      createBufferSource: () => {
        return fakeObj;
      },
    };

    audio.audioContext.destination = null;

    const source = await audio.createSource();

    assert.deepStrictEqual(source, fakeObj);
  });

  it("initCorrelation creates Correlation instance with sample rate from decode method", async () => {
    assert.strictEqual(audio.correlation, null);
    await audio.initCorrelation();
    assert.ok(audio.correlation instanceof Correlation);
    assert.strictEqual(audio.correlation.sampleRate, fakeDecode().sampleRate);
  });
});
