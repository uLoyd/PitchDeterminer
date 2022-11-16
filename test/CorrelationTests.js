const assert = require("assert");
const {
  Correlation: CorrelationTests,
} = require("../customModules/audioModules/index");
const testBuffer = require("./data/buffer");

describe(`Default Correlation`, function () {
  let correlation;

  beforeEach(() => {
    correlation = new CorrelationTests({
      sampleRate: 48000,
      rmsThreshold: 0.01,
      correlationThreshold: 0.5,
      correlationDegree: 0.98,
      buflen: 8192,
    });
  });

  it("Correlation instance exists", () => assert.ok(correlation));

  it("Autocorrelation with default correlationSampleStep, for given buffer returns aprox. 54.98 Hz", () => {
    const actual = correlation.perform(testBuffer).toFixed(2);
    assert.strictEqual(actual, "54.98");
  });

  it("Autocorrelation with default correlationSampleStep set to 1, for given buffer returns aprox. 54.98 Hz", () => {
    const actual = correlation.perform(testBuffer, 1).toFixed(2);
    assert.strictEqual(actual, "54.98");
  });

  it("Autocorrelation with buffer filled with zeros will return -1", () => {
    const actual = correlation.perform(new Array(8192).fill(0));
    assert.strictEqual(actual, -1);
  });

  it("defaultCorrelationSampleStep is equal to 2 for buffer length 8192", () => {
    assert.strictEqual(correlation.defaultCorrelationSampleStep, 2);
  });

  it(`defaultCorrelationSampleStep is equal 1 for buffer length below 8192`, () => {
    const lowBuflenCorrelation = new CorrelationTests({ buflen: 4096 });
    assert.strictEqual(lowBuflenCorrelation.defaultCorrelationSampleStep, 1);
  });
});
