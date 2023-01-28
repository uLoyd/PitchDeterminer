"use strict";

const {
  Analyser,
  Gain,
  AudioHandler,
  Correlation,
  FrequencyMath,
} = require("../../../customModules/audioModules/index");
const testData = require("../../data/AudioHandlerInitData")[0];
const audioBufForCorrelation = require("../data/buffer.json");
require("web-audio-test-api");

const audio = new AudioHandler({
  general: testData.params.general,
  gainNode: new Gain(testData.params.gainSettings),
  analyserNode: new Analyser(testData.params.analyserSettings),
});

let start = -128;
const dummyBuffer = new Array(2048).fill(0).map(() => {
  if (start === 256) start = -129;
  return ++start;
});

const fakeFTD32 = () => {
  return audioBufForCorrelation;
};
const fakeGetBFDUint8 = () => {
  return dummyBuffer;
};
audio.BFDUint8 = fakeGetBFDUint8;
audio.FTDFloat32 = fakeFTD32;
audio.bandRange = 4;
audio.binCount = 2048;
audio.correlation = new Correlation({
  sampleRate: 48000,
  rmsThreshold: 0.01,
  correlationThreshold: 0.5,
  correlationDegree: 0.98,
  buflen: 8192,
});

function runWeighted() {
  audio.getWeightedVolume(2);
}

function runNotWeighted() {
  audio.getVolume(2);
}

function runCorrelation() {
  return audio.correlation.perform(audioBufForCorrelation);
}

function runFq() {
  return new FrequencyMath(Math.random() * (2000 - 1) + 1);
}

module.exports = [
  // {
  //     name: "AudioHandler::getWeightedVolume",
  //     runAmount: 500,
  //     run: runWeighted
  // },
  {
    name: "AudioHandler::correlate",
    runAmount: 1,
    run: runCorrelation,
  },
  {
    name: "AudioHandler::getVolume",
    runAmount: 10000,
    run: runNotWeighted,
  },
  {
    name: "FQ",
    runAmount: 10000,
    run: runFq,
  },
];

/*
1 2 3 4 5 6 7 8 = 36
4 8 2 1 7 5 3 6 = 36
3 6 1 3 2 1 4 2 = 22




 */
