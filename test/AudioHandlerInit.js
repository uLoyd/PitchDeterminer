const assert = require('assert');
const path = require('path');
const Application = require('spectron').Application;
const electronPath = require('electron').remote;
const audioHandler = require('../customModules/audioModules/audioHandler');
const { analyser, gain } = require('../customModules/audioModules/audioHandlerComponents/defaultAudioValues').audioSetup;
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
       let tools;

       before(() => {
           audio = new audioHandler(data.params, () => {});
           tools = audio.audioTools;
           tools.analyserSetup();

           app.start();
       });

       after(async (done) => {
           if (app && app.isRunning()) {
               await app.stop();
           }
           done();
       });

       it('Audio handler exists', () => {
           //console.log(audio.audioTools);
           assert.ok(audio);
       });

       describe('Audio Handler Analyser Node Initialization', () => {
           const values = {};
           before(() => {
               const { minDec, maxDec, fft, smoothing } = data.compare;
               const { minDecibels, maxDecibels, fftSize, smoothingTimeConstant } = tools.analyser;
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
                const { minValue, maxValue } = tools.gainNode;
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