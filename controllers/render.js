const frequencyMath = require('./../customModules/audioModules/frequencyMath.js'),
    audioHandler = require('./../customModules/audioModules/audioHandler'),
    audioFileHandler = require('./../customModules/audioModules/audioFileHandler'),
    soundStorageEvent = require('./helpers/soundStorageEvent'),
    audioTest = require('./audioHandleTest'),
    tuner = require('./tuner'),
    fs = require('fs');

const { Fretboard } = require('./../customModules/fretboard/Fretboard');
const { Sound, sounds } = require('./../customModules/fretboard/Sound');

window.onload = async () => {
    let soundDataEvent = new soundStorageEvent();
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
        const snd = new frequencyMath(soundDataEvent.determine()).getSoundInfo();
        test.updatePitch(snd);
        fretboardInstance.addCurrentSound(snd.soundId)
            .addSoundMarksOnStrings();
    }

    function updateTuner(ac){
        let errorUpdate = soundDataEvent.determine(false);
        errorUpdate = errorUpdate ? errorUpdate : ac;

        if(errorUpdate > -1)
            tun.update(new frequencyMath(errorUpdate).getFrequencyError());
    }

    async function changeInput(id) {
        mic.changeInput(id);

        // "Have you tried turning it off and on again?"
        await mic.end();
        test.clearData();
        tun.clear();
        console.log("Restarting with new settings");
        await mic.setupStream();
    }

    async function changeOutput(id, force) {
        mic.changeOutput(id);

        const audioOutput = document.querySelector('audio');

        if(force || audioOutput.srcObject){
            const audioOutput = document.querySelector('audio');
            audioOutput.srcObject = mic.stream;
            audioOutput.setSinkId(id);
        }
    }

    async function changeDevice() {
        if (!mic.running)
            return;

        this.dir === 'input' ? await changeInput(this.id) : await changeOutput(this.id);
    }

    // passed true = turn off, false = turn on, nothing = switch
    async function speakerToggleEvent() {
        const { speakerBut } = test.elements;
        const audio = document.querySelector('audio');
        if(test.speakerEnabled && mic.running){
            test.buttonToggle(speakerBut, true);
            return audio.srcObject = mic.stream;
        }

        test.buttonToggle(speakerBut, false);
        audio.srcObject = null;
    }

    // audioHandler instance
    let mic = new audioHandler();

    // audioHandleTest instance - shows data in window
    const test = new audioTest(changeDevice, speakerToggleEvent);
    test.elements.micBut.element.onclick = mic.setupStream.bind(mic);

    const tun = new tuner();

    mic.on("DeviceChange", test.updateDeviceList.bind(test));

    mic.on("AudioProcessUpdate", (evt) => {
        const volume = evt.getVolume(2);

        test.updateVolume(volume);

        const ac = evt.correlate();

        if (ac > -1) { // Add data to object as long as the correlation and signal are good
            soundDataEvent.add(ac);
            updateTuner();
        }
        else if(soundDataEvent.selfCheck() > 3)
            soundDataEvent.emit("SampleLimit", soundDataEvent);
        else
            soundDataEvent.emptyData();
    });

    mic.on("StreamEnd", (evt) => {
        const { micBut, speakerBut } = test.elements;
        test.buttonToggle(micBut, false);
        test.buttonToggle(speakerBut, false);
        test.elements.micBut.element.onclick = evt.setupStream.bind(evt);
        test.speakerEnabled = false;
        test.clearData();
        tun.clear();
        soundDataEvent.emptyData();
        document.querySelector('audio').srcObject = null;
    });

    mic.on("SetupDone", async (evt) => {
        const { micBut } = test.elements;
        micBut.element.onclick = evt.end.bind(evt);
        test.buttonToggle(micBut, true);
    });

    soundDataEvent.on("SampleLimit", (evt) => {
        updatePitch();
        evt.emptyData();
    });

    soundDataEvent.on("SampleTarget", () => {
        updatePitch();
    });

    await test.updateDeviceList(mic);

    /*
    const fileHandler = new audioFileHandler({}, './controllers/audio/test.wav');
    await fileHandler.initCorrelation();
    (await fileHandler.createSource()).start(0);
    */
    /*
    const fileHandler = new audioFileHandler({}, './controllers/audio/E2.wav');
    await fileHandler.initCorrelation();
    (await fileHandler.createSource()).start(0);

    fileHandler.on("ProcessedFileChunk", evt =>
        console.log(fileHandler.correlation.perform(evt)));

    //fileHandler.processEvent();

    fileHandler.processCallback(data => console.log(fileHandler.correlation.perform(data)));
    */
    /*
    const fileHandler = new audioFileHandler({}, './controllers/audio/B3.wav');
    await fileHandler.initCorrelation();
    const content = [];
    await fileHandler.processCallback(data => content.push(fileHandler.correlation.perform(data)));
    fs.writeFile('./test/data/B3.json', JSON.stringify(content), () => {});
    */
}