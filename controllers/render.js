const frequencyMath = require('./../customModules/audioModules/frequencyMath.js'),
    audioHandler = require('./../customModules/audioModules/audioHandler'),
    soundStorage = require('./helpers/soundStorage'),
    audioTest = require('./audioHandleTest'),
    tuner = require('./tuner');

window.onload = async function() {
    const soundData = new soundStorage(); // soundData instance
    const freqMath = new frequencyMath(); // frequencyMath instance

    function updatePitch(){
        test.updatePitch(freqMath.getSoundInfo(soundData.determine()));
        soundData.emptyData();
    }

    function updateTuner(ac){
        let errorUpdate = soundData.determine();
        errorUpdate = errorUpdate ? errorUpdate : ac;

        if(errorUpdate > -1)
            tun.update(freqMath.getFrequencyError(errorUpdate));
    }

    // callback passed to audioHandler that will be receiving audio data to process
    function dataProcess(time) {
        test.updateVolume(mic.getVolume(2));

        const ac = mic.correlate();

        if (ac > -1) { // Add data to object as long as the correlation and signal are good
            soundData.add(ac);
            updateTuner(ac);

            if(soundData.selfCheck() > 30)
                updatePitch();
        }
        else  if (soundData.selfCheck()) { // if soundData not empty
            updatePitch();                 // send data to controller and update displayed note
            updateTuner(ac);
        }
        else{
            soundData.emptyData();         // Empty the whole data storage object
        }
    }


    async function changeDevice(e) {
        e.dir === 'input' ? mic.changeInput(e.id) : mic.changeOutput(e.id);
        //mic.changeInput(e);

        // No need to restart if it's not running
        if (!mic.running)
            return;

        // "Have you tried turning it off and on again?"
        await mic.end();
        test.clearData();
        tun.clear();
        console.log("Restarting with new settings");
        await mic.setupStream();
    }

    async function micToggleEvent() {
        const state = mic.running;

        if (state) {
            await mic.end();
            test.clearData();
            tun.clear();
        } else {
            mic.streamReady ? await mic.resume() : await mic.setupStream();
        }

        test.micState(!state); //Returning opposite state to change icon color
    }

    // callback that will be passed to deviceHandler from audioHandlers constructor
    function deviceChangeAction(deviceArray, currentInput, currentOutput) {
        test?.updateDeviceList(deviceArray, currentInput, currentOutput);
    }

    // audioHandler instance
    let mic = new audioHandler({
        deviceChange: deviceChangeAction,
        outputElement: document.querySelector('audio')
    }, dataProcess);

    // audioHandleTest instance - shows data in window
    const test = new audioTest(changeDevice, micToggleEvent);
    const tun = new tuner();
}