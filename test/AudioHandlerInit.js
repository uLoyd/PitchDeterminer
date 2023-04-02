const assert = require("assert");
const {
    Analyser,
    Gain,
    AudioHandler,
} = require("../customModules/audioModules/index");
const testData = require("./data/AudioHandlerInitData");
require("web-audio-test-api");

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

        beforeEach(() => {
            audio = new AudioHandler({
                general: data.params.general,
                gainNode: new Gain(data.params.gainSettings),
                analyserNode: new Analyser(data.params.analyserSettings),
            });
        });

        it("Audio handler exists", () => assert.ok(audio));

        it("Audio handler buflen value", () =>
            assert.strictEqual(audio.buflen, data.compare.buflen));

        it("Audio handler sound curve algorithm instance", () =>
            assert.strictEqual(
                audio.soundCurve instanceof data.compare.soundCurve,
                true
            ));

        describe("Audio Handler Analyser  Initialization", () => {
            const values = {};

            beforeEach(() => {
                const expected = data.compare;
                audio.analyser.node = {
                    smoothingTimeConstant: 1,
                    fftSize: 2,
                    minDecibels: 3,
                    maxDecibels: 4,
                };
                audio.analyser.applySettings();
                const actual = audio.analyser.node;
                values.minDecibels = compObj(
                    actual.minDecibels,
                    expected.minDecibels
                );
                values.maxDecibels = compObj(
                    actual.maxDecibels,
                    expected.maxDecibels
                );
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
            beforeEach(() => {
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
