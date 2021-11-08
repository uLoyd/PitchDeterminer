const assert = require('assert');
const path = require('path');
const Application = require('spectron').Application;
const audioHandler = require('../customModules/audioModules/audioHandler');
const { AnalyserNode, GainNode } = require('../customModules/audioModules/index');
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
           audio = new audioHandler({
               general: data.params.general,
               gainNode: new GainNode(data.params.gainSettings),
               analyserNode: new AnalyserNode(data.params.analyserSettings)
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

       describe('Audio Handler Analyser Node Initialization', () => {
           const values = {};
           before(() => {
               const { minDec, maxDec, fft, smoothing } = data.compare;
               const { minDecibels, maxDecibels, fftSize, smoothingTimeConstant } = audio.analyser;
               values.minDec = compObj(minDec, minDecibels);
               values.maxDec = compObj(maxDec, maxDecibels);
               values.fft = compObj(fft, fftSize);
               values.smoothing = compObj(smoothing, smoothingTimeConstant);
           });

           it('Smoothing value', () => {
               const { smoothing } = values;
               smoothing.assert();
           });

           it('FFT Size', () => {
               const { fft } = values;
               fft.assert();
           });

           it('Min Decibels Size', () => {
               const { minDec } = values;
               minDec.assert();
           });

           it('Max Decibels Size', () => {
               const { maxDec } = values;
               maxDec.assert();
           });
       });

       describe('Audio Handler Gain Node Initialization', () => {
            const values = {};
            before(() => {
                const { minGain, maxGain } = data.compare;
                const { minValue, maxValue } = audio.gain;
                values.minGain = compObj(minGain, minValue);
                values.maxGain = compObj(maxGain, maxValue);
            });

            it('Min Gain Size', () => {
                const { minGain } = values;
                minGain.assert();
            });

            it('Max Gain Size', () => {
                const { maxGain } = values;
                maxGain.assert();
            });
        });
   });
});