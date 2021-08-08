module.exports = [
    // default not used as the mock web-audio-api can't handle fft size over 2048
    /*{
        title: 'Default',
        params: {},
        compare: {
            fft: analyser.fftSize,
            minDec: analyser.minDec,
            maxDec: analyser.maxDec,
            smoothing: analyser.smoothing,
            minGain: gain.minGain,
            maxGain: gain.maxGain
        }
    },*/
    {
        title: 'Custom1',
        params: {
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
            maxDec: -10
        }
    },
    {
        title: 'Custom2',
        params: {
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
            maxDec: -20
        }
    }
];