const Weight = require('../../customModules/audioModules/weights').all;
const defaults = require('../../customModules/audioModules/audioHandlerComponents/defaultAudioValues');
const { analyser, gain } = defaults.audioSetup;

module.exports = [
    {
        title: 'Default',
        params: {
            analyserSettings: {
                fftSize: 512
            }
        },
        compare: {
            fft: 512,
            minDec: analyser.minDec,
            maxDec: analyser.maxDec,
            smoothing: analyser.smoothing,
            minGain: gain.minGain,
            maxGain: gain.maxGain,
            soundCurve: Weight.Aweight,
            buflen: defaults.general.buflen
        }
    },
    {
        title: 'Custom1',
        params: {
            general: {
                buflen: 512  
            },
            soundCurveAlgorithm: 'B',
            gainSettings: {
                minGain: 1,
                maxGain: 2
            },
            analyserSettings: {
                smoothing: 1,
                fftSize: 1024,
                minDec: -50,
                maxDec: -10
            }
        },
        compare: {
            minGain: 1,
            maxGain: 2,
            smoothing: 1,
            fft: 1024,
            minDec: -50,
            maxDec: -10,
            buflen: 512,
            soundCurve: Weight.Bweight
        }
    },
    {
        title: 'Custom2',
        params: {
            general: {
                buflen: 2048
            },
            soundCurveAlgorithm: 'C',
            gainSettings: {
                minGain: 0.3,
                maxGain: 0.6
            },
            analyserSettings: {
                smoothing: 5,
                fftSize: 512,
                minDec: -45,
                maxDec: -20
            }
        },
        compare: {
            minGain: 0.3,
            maxGain: 0.6,
            smoothing: 5,
            fft: 512,
            minDec: -45,
            maxDec: -20,
            buflen: 2048,
            soundCurve: Weight.Cweight
        }
    }
];