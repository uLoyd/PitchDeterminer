const assert = require('assert');
const path = require('path');
const Application = require('spectron').Application;
const { Analyser, Gain, AudioHandler } = require('../customModules/audioModules/index');
const testData = require('./data/AudioHandlerInitData');
require("web-audio-test-api"); // web-audio-api mock

const app = new Application({
    path: /*electronPath*/ './app.js',
    args: [path.join(__dirname, '..')]
});

const compObj = (value, expected) => {
    return {
        value,
        expected,
        assert: () => assert.strictEqual(this.value, this.expected, `v:${this.value}; e:${this.expected}`)
    }
}

testData.forEach(async (data) => {
    describe(`Audio Handler Initialization with params: ${data.title}`, function () {
       let audio;

       before(() => {
           audio = new AudioHandler({
               general: data.params.general,
               gain: new Gain(data.params.gainSettings),
               analyser: new Analyser(data.params.analyserSettings)
           });

           app.start();
       });

       after(async (done) => {
           if (app && app.isRunning()) {
               await app.stop();
           }
           done();
       });

       it('Audio handler exists', () => assert.ok(audio));

       it('Audio handler buflen value', () =>
           assert.strictEqual(audio.buflen, data.compare.buflen));

       it('Audio handler sound curve algorithm instance', () =>
           assert.strictEqual(audio.soundCurve instanceof data.compare.soundCurve, true));

       describe('Audio Handler Analyser  Initialization', () => {
           const values = {};
           before(() => {
               const expected = data.compare;
               const actual = audio.analyser.node;
               values.minDecibels = compObj(actual.minDecibels, expected.minDecibels);
               values.maxDecibels = compObj(actual.maxDecibels, expected.maxDecibels);
               values.fftSize = compObj(actual.fftSize, expected.fftSize);
               values.smoothingTimeConstant = compObj(actual.smoothingTimeConstant, expected.smoothingTimeConstant);
           });

           it('Smoothing value', () => {
               const { smoothingTimeConstant } = values;
               smoothingTimeConstant.assert();
           });

           it('FFT Size', () => {
               const { fftSize } = values;
               fftSize.assert();
           });

           it('Min Decibels Size', () => {
               const { minDecibels } = values;
               minDecibels.assert();
           });

           it('Max Decibels Size', () => {
               const { maxDecibels } = values;
               maxDecibels.assert();
           });
       });

       describe('Audio Handler Gain  Initialization', () => {
            const values = {};
            before(() => {
                const actual = data.compare;
                const expected = audio.gain.node;
                values.minValue = compObj(actual.minValue, expected.minValue);
                values.maxValue = compObj(actual.maxValue, expected.maxValue);
            });

            it('Min Gain Size', () => {
                const { minValue } = values;
                minValue.assert();
            });

            it('Max Gain Size', () => {
                const { maxValue } = values;
                maxValue.assert();
            });
        });
   });
});