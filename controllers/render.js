let frequencyMath = require('./../customModules/audioModules/frequencyMath.js'),
    audioHandler = require('./../customModules/audioModules/audioHandler'),
    soundStorage = require('./helpers/soundStorage'),
    audioTest = require('./audioHandleTest'),
    tuner = require('./tuner');

const { Fretboard } = require('./../customModules/fretboard/Fretboard');
const { Sound, sounds } = require('./../customModules/fretboard/Sound');

window.onload = async function() {
    const soundData = new soundStorage(); // soundData instance
    const freqMath = new frequencyMath(); // frequencyMath instance

    const fretboardInstance = new Fretboard({
        container: document.getElementById('fretboard'),
        frets: 12,
        tuning: [
            new Sound('E', 4),
            new Sound('B', 3),
            new Sound('G', 3),
            new Sound('D', 3),
            new Sound('A', 2),
            new Sound('E', 2)
        ],
        // evt - event...
        // lane - StringLane instance
        onTuningChangeEvt: (evt, lane) => fretboardInstance.addSoundMarksOnString(lane),
        // evt - event...
        // lane - StringLane instance
        onOctaveChangeEvt: (evt, lane) => fretboardInstance.addSoundMarksOnString(lane),
        octaveRange: { min: 1, max: 9 },
        // tuning - Sound instance with value of string
        // fretSound - Sound instance with value of sound on a specific clicked fret
        // marked - is the fret currently marked or not (Boolean)
        // evt - event...
        fretsClick: (tuning, fretSound, marked, evt) => {
            const soundIndex = sounds.indexOf(fretSound.sound);
            if(marked)
                fretboardInstance.removeCurrentSound(soundIndex)
                    .addSoundMarksOnStrings();
            else
                fretboardInstance.addCurrentSound(soundIndex)
                    .addSoundMarksOnStrings();
        },
        emptyStringClasses: ['col', 'd-flex', 'justify-content-center', 'empty_string']
    })
        .create([0, 3, 5, 7, 9, 12]);

    function updatePitch(){
        const snd = new frequencyMath(soundData.determine()).getSoundInfo();
        test.updatePitch(snd);
        fretboardInstance.addCurrentSound(snd.soundId)
            .addSoundMarksOnStrings();
        soundData.emptyData();
    }

    function updateTuner(ac){
        let errorUpdate = soundData.determine();
        errorUpdate = errorUpdate ? errorUpdate : ac;

        if(errorUpdate > -1)
            tun.update(new frequencyMath(errorUpdate).getFrequencyError());
    }

    // callback passed to audioHandler that will be receiving audio data to process
    function dataProcess(time) {
        let volume = mic.getVolume(2);

        test.updateVolume(volume);

        const ac = mic.correlate();

        if (ac > -1) { // Add data to object as long as the correlation and signal are good
            soundData.add(ac);
            updateTuner(ac);

            if(soundData.selfCheck() > 30){
                updatePitch();
            }
        }
        else  if (soundData.selfCheck()) { // if soundData not empty
            updatePitch();                 // send data to controller and update displayed note
            updateTuner(ac);
        } else {
            if (soundData.selfCheck())                                          // if soundData not empty
                test.updatePitch(freqMath.getSoundInfo(soundData.determine())); // send data to controller and update displayed note

            soundData.emptyData();                                              // Empty the whole data storage object
        }
    }


    async function changeDevice() {
        this.dir === 'input' ? mic.changeInput(this.id) : mic.changeOutput(this.id);

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