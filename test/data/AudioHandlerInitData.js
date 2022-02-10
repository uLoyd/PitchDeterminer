const Weight = require('../../customModules/audioModules/weights').all;
const defaults = require('../../customModules/audioModules/audioHandlerComponents/defaultAudioValues');
const { analyser, gain } = defaults.audioSetup;

module.exports = [
    {
        title: 'Default',
        params: {
            analyserSettings: {
                fftSize: 512
            },
            gainSettings: {}
        },
        compare: {
            fftSize: 512,
            minDecibels: analyser.minDecibels,
            maxDecibels: analyser.maxDecibels,
            smoothingTimeConstant: analyser.smoothingTimeConstant,
            value: gain.value,
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
                value: 1
            },
            analyserSettings: {
                smoothingTimeConstant: 1,
                fftSize: 1024,
                minDecibels: -50,
                maxDecibels: -10
            }
        },
        compare: {
            value: 1,
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
                value: 0.3
            },
            analyserSettings: {
                smoothingTimeConstant: 5,
                fftSize: 512,
                minDecibels: -45,
                maxDecibels: -20
            }
        },
        compare: {
            value: 0.3,
            smoothingTimeConstant: 5,
            fftSize: 512,
            minDecibels: -45,
            maxDecibels: -20,
            buflen: 2048,
            soundCurve: Weight.Cweight
        }
    }
];