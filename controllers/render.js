const frequencyMath = require('./../customModules/audioModules/frequencyMath.js'),
    audioHandler = require('./../customModules/audioModules/audioHandler'),
    soundStorage = require('./helpers/soundStorage'),
    audioTest = require('./audioHandleTest');

window.onload = async function() {
    const soundData = new soundStorage(); // soundData instance
    const freqMath = new frequencyMath(); // frequencyMath instance

    // callback passed to audioHandler that will be receiving audio data to process
    function dataProcess(time) {
        let volume = mic.getVolume(2);

        test.updateVolume(volume);

        const ac = mic.correlate();

        if (ac > -1) { // Add data to object as long as the correlation and signal are good
            soundData.add(ac);
        } else {
            if (soundData.selfCheck())                                          // if soundData not empty
                test.updatePitch(freqMath.getSoundInfo(soundData.determine())); // send data to controller and update displayed note

            soundData.emptyData();                                              // Empty the whole data storage object
        }
    }


    async function changeInput(e) {
        mic.changeInput(e);

        // No need to restart if it's not running
        if (!mic.running)
            return;

        // "Have you tried turning it off and on again?"
        await mic.end();
        test.clearData();
        console.log("Restarting with new settings");
        await mic.setupStream();
    }

    async function micToggleEvent() {
        const state = mic.running;

        if (state) {
            await mic.pause();
            test.clearData();
        } else {
            mic.streamReady ? await mic.resume() : await mic.setupStream();
        }

        test.micState(!state); //Returning opposite state to change icon color
    }

    // callback that will be passed to deviceHandler from audioHandlers constructor
    function deviceChangeAction(deviceArray, currentInput, currentOutput) {
        test?.updateDeviceList(deviceArray);
    }

    // audioHandler instance
    let mic = new audioHandler({
        deviceChange: deviceChangeAction
    }, dataProcess);

    // audioHandleTest instance - shows data in window
    let test = new audioTest(changeInput, micToggleEvent);
}