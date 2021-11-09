const defaultAudioValues = {
  correlation: {
    minSamples: 100,
    rmsThreshold: 0.01,
    correlationThreshold: 0.01,
    correlationDegree: 0.98
  },
  audioSetup: {
    gain: {
      minValue: 0.7,
      maxValue: 0.85
    },
    analyser: {
      smoothingTimeConstant: 0.9,
      fftSize: 32768, // max possible size
      minDecibels: -90,
      maxDecibels: -10
    }
  },
  general: {
    curveAlgorithm: 'A',
    buflen: 4096 // Going lower than 2048 results in really low accuracy in determining frequencies
  }
}

module.exports.all = defaultAudioValues;
module.exports.audioSetup = defaultAudioValues.audioSetup;
module.exports.correlation = defaultAudioValues.correlation;
module.exports.general = defaultAudioValues.general;
