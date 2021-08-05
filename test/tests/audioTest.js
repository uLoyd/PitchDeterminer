const audioHandler = require('../../customModules/audioModules/audioHandler');
const defaults = require('../../customModules/audioModules/audioHandlerComponents/defaultAudioValues');
const assert = require('assert');

module.exports = async () => {
    // defaults
    const audio = new audioHandler({}, () => {});
    const tools = audio.audioTools;

    console.log("%c# DEFAULT AUDIO CONTEXT ERRORS: #", "background: #444; color: #bada55;");
    assert(audio.audioTools.audioContext, audio.audioTools.audioContext);

    console.log("%c# DEFAULT AUDIO RUNNING STATE: #", "background: #444; color: #bada55;");
    assert(tools.audioContext.state === 'running', tools.audioContext.state);
    assert(audio.running === false, audio.running);
    await audio.setupStream();
    assert(audio.running === true, audio.running);

    // default analyser
    console.log("%c# DEFAULT ANALYSER ERRORS: #", "background: #444; color: #bada55;");
    assert(tools.analyser, tools.analyser);
    assert(tools.analyser.fftSize === defaults.audioSetup.analyser.fftSize, tools.analyser.fftSize);
    assert(tools.analyser.smoothingTimeConstant === defaults.audioSetup.analyser.smoothing, tools.analyser.smoothingTimeConstant);
    assert(tools.analyser.minDecibels === defaults.audioSetup.analyser.minDec, tools.analyser.minDecibels);
    assert(tools.analyser.maxDecibels === defaults.audioSetup.analyser.maxDec, tools.analyser.maxDecibels);

    // default gain
    console.log("%c# DEFAULT GAIN ERRORS: #", "background: #444; color: #bada55;");
    assert(tools.gainNode, tools.gainNode);
    assert(tools.gainNode.minValue === defaults.audioSetup.gain.minGain, tools.gainNode.minValue);
    assert(tools.gainNode.maxValue === defaults.audioSetup.gain.maxGain, tools.gainNode.maxValue);

    console.log("%c# DEFAULT AUDIO RUNNING STATE: #", "background: #444; color: #bada55;");
    assert(audio.running === true);
    await audio.end();
    assert(audio.running === false);
    assert(tools.audioContext.state === 'closed');

    const settings = {
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
    }

    const customAudio = new audioHandler(settings, () => {});
    const customTools = customAudio.audioTools;

    console.log("%c# CUSTOM AUDIO CONTEXT ERRORS: #", "background: #444; color: #ffcc00;");
    assert(customAudio.audioTools.audioContext, customAudio.audioTools.audioContext);

    console.log("%c# CUSTOM AUDIO RUNNING STATE: #", "background: #444; color: #ffcc00;");
    assert(customTools.audioContext.state === 'running', customTools.audioContext.state);
    assert(customAudio.running === false, customAudio.running);
    await customAudio.setupStream();
    assert(customAudio.running === true, customAudio.running);

    // custom analyser
    console.log("%c# CUSTOM ANALYSER ERRORS: #", "background: #444; color: #ffcc00;");
    assert(customTools.analyser, customTools.analyser);
    assert(customTools.analyser.fftSize === settings.analyserSettings.fftSize, customTools.analyserSettings, customTools.analyser.fftSize);
    assert(customTools.analyser.smoothingTimeConstant === settings.analyserSettings.smoothing, customTools.analyser.smoothingTimeConstant);
    assert(customTools.analyser.minDecibels === settings.analyserSettings.minDec, customTools.analyser.minDecibels);
    assert(customTools.analyser.maxDecibels === settings.analyserSettings.maxDec, customTools.analyser.maxDecibels);

    // custom gain
    console.log("%c# CUSTOM GAIN ERRORS: #", "background: #444; color: #ffcc00;");
    assert(customTools.gainNode, customTools.gainNode);
    assert(customTools.gainNode.minValue === settings.gainSettings.minGain, customTools.gainNode.minValue);
    assert(customTools.gainNode.maxValue === settings.gainSettings.maxGain, customTools.gainNode.maxValue);

    console.log("%c# CUSTOM AUDIO RUNNING STATE: #", "background: #444; color: #ffcc00;");
    assert(customAudio.running === true, customAudio.running);
    await customAudio.end();
    assert(customAudio.running === false, customAudio.running);
    assert(customTools.audioContext.state === 'closed', customTools.audioContext.state);
}
