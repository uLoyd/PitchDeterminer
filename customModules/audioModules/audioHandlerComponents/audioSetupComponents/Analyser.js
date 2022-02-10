/* eslint-disable */
const IAudioNode = require('./IAudioNode');
const defaults = require('../defaultAudioValues').audioSetup.analyser;

class Analyser extends IAudioNode {
    constructor(settings = {}) {
        console.log('con', settings);
        super(settings, defaults);
    }

    create(context, applySettings = true) {
        this.node = context.createAnalyser();

        if(applySettings)
            this.applySettings();

        return this;
    }
}

module.exports = Analyser;