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
            fftSize: 512,
            minDecibels: analyser.minDecibels,
            maxDecibels: analyser.maxDecibels,
            smoothingTimeConstant: analyser.smoothing,
            minValue: gain.minValue,
            maxValue: gain.maxValue,
            soundCurve: Weight.Aweight,
            buflen: defaults.general.buflen
        }
    },
    {
        title: 'Custom1',
        params: {
            general: {
                buflen: 512,
                curveAlgorithm: 'B'
            },
            gainSettings: {
                minValue: 1,
                maxValue: 2
            },
            analyserSettings: {
                smoothingTimeConstant: 1,
                fftSize: 1024,
                minDecibels: -50,
                maxDecibels: -10
            }
        },
        compare: {
            minValue: 1,
            maxValue: 2,
            smoothingTimeConstant: 1,
            fftSize: 1024,
            minDecibels: -50,
            maxDecibels: -10,
            buflen: 512,
            soundCurve: Weight.Bweight
        }
    },
    {
        title: 'Custom2',
        params: {
            general: {
                buflen: 2048,
                curveAlgorithm: 'C'
            },
            gainSettings: {
                minValue: 0.3,
                maxValue: 0.6
            },
            analyserSettings: {
                smoothingTimeConstant: 5,
                fftSize: 512,
                minDecibels: -45,
                maxDecibels: -20
            }
        },
        compare: {
            minValue: 0.3,
            maxValue: 0.6,
            smoothingTimeConstant: 5,
            fftSize: 512,
            minDecibels: -45,
            maxDecibels: -20,
            buflen: 2048,
            soundCurve: Weight.Cweight
        }
    }
];