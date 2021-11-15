const IAudioNode = require('./IAudioNode');
const defaults = require('../defaultAudioValues').audioSetup.gain;

class Gain extends IAudioNode {
    constructor(settings) {
        super(settings, defaults)
    }

    create(context, applySettings = true) {
        this.node = context.createGain();

        if(applySettings)
            this.applySettings();

        return this;
    }
}

module.exports = Gain;