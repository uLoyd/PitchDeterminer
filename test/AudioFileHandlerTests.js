const assert = require("assert");
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

  const willThrow = async function (callback, params) {
    try {
      await callback(...params);
      assert.ok(false);
    } catch (e) {
      assert.ok(true);
    }
  };

  const assertProcessOutput = function (expected, actual) {
    assert.strictEqual(expected.length, actual.length);

    expected.forEach((elem, index) => {
      assert.strictEqual(elem, actual[index]);
    });
  };

  before(() => {
    audio = new AudioFileHandler(
      {
        general: testData.params.general,
        gainNode: new Gain(testData.params.gainSettings),
        analyserNode: new Analyser(testData.params.analyserSettings),
      },
      "notExistingFile.wav"
    );

    audio.decode = fakeDecode;
    audio.buflen = 1;
  });

  it("toArrayBuffer returns ArrayBuffer", () => {
    const actual = audio.toArrayBuffer([0, 1, 2, 3, 4]);
    assert.ok(actual instanceof ArrayBuffer);
  });

  it("toArrayBuffer elements are unchanged", () => {
    const initialArray = [0, 1, 2, 3, 4];
    const actual = audio.toArrayBuffer(initialArray);

    for (let i = 0; i < actual.length; ++i) {
      assert.strictEqual(actual[i], initialArray[i]);
    }
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
      assert.strictEqual(chunk.length, 1);
      output.push(chunk[0]);
    };

    audio.process([...expectedOutput], callback);

    assertProcessOutput(expectedOutput, output);
  });

  it("processCallback will call action 5 times for array of 5 elements and buffer of 1", async () => {
    const expectedOutput = [0, 1, 2, 3, 4];
    const output = [];

    const callback = (chunk) => {
      assert.strictEqual(chunk.length, 1);
      output.push(chunk[0]);
    };

    await audio.processCallback(callback);

    assertProcessOutput(expectedOutput, output);
  });

  it("processEvent will call action 5 times for array of 5 elements and buffer of 1", async () => {
    const expectedOutput = [0, 1, 2, 3, 4];
    const output = [];

    audio.on(AudioEvents.processedFileChunk, (chunk) => {
      assert.strictEqual(chunk.length, 1);
      output.push(chunk[0]);
    });

    await audio.processEvent();

    assertProcessOutput(expectedOutput, output);
  });

  it("createSource will return output of AudioContext.createBufferSource", async () => {
    const fakeObj = {
      buffer: 0,
      connect: () => {},
    };

    const fakeAudioContext = {
      createBufferSource: () => {
        return fakeObj;
      },
    };

    audio.audioContext = fakeAudioContext;
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
