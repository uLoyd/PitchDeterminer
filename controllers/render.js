const {
  FrequencyMath,
  AudioHandler,
  AudioFileHandler,
  AudioEvents,
  SoundStorageEvent,
} = require("../customModules/audioModules/index");

const audioTest = require("./audioHandleTest"),
  tuner = require("./tuner"),
  fs = require("fs");

// const { Fretboard } = require("./../customModules/fretboard/Fretboard");
// const { Sound, sounds } = require("./../customModules/fretboard/Sound");
const { Device } = require("../customModules/audioModules");

window.onload = async () => {
  let soundDataEvent = new SoundStorageEvent();
  // const fretboardInstance = new Fretboard({
  //   container: document.getElementById("fretboard"),
  //   frets: 12,
  //   tuning: [
  //     new Sound("E", 4),
  //     new Sound("B", 3),
  //     new Sound("G", 3),
  //     new Sound("D", 3),
  //     new Sound("A", 2),
  //     new Sound("E", 2),
  //   ],
  //   // evt - event...
  //   // lane - StringLane instance
  //   onTuningChangeEvt: (evt, lane) =>
  //     fretboardInstance.addSoundMarksOnString(lane),
  //   // evt - event...
  //   // lane - StringLane instance
  //   onOctaveChangeEvt: (evt, lane) =>
  //     fretboardInstance.addSoundMarksOnString(lane),
  //   octaveRange: { min: 1, max: 9 },
  //   // tuning - Sound instance with value of string
  //   // fretSound - Sound instance with value of sound on a specific clicked fret
  //   // marked - is the fret currently marked or not (Boolean)
  //   // evt - event...
  //   fretsClick: (tuning, fretSound, marked, evt) => {
  //     const soundIndex = sounds.indexOf(fretSound.sound);
  //     if (marked)
  //       fretboardInstance
  //         .removeCurrentSound(soundIndex)
  //         .addSoundMarksOnStrings();
  //     else
  //       fretboardInstance.addCurrentSound(soundIndex).addSoundMarksOnStrings();
  //   },
  //   emptyStringClasses: [
  //     "col",
  //     "d-flex",
  //     "justify-content-center",
  //     "empty_string",
  //   ],
  // }).create([0, 3, 5, 7, 9, 12]);

  function updatePitch() {
    const snd = new FrequencyMath(soundDataEvent.determine()).getSoundInfo();
    test.updatePitch(snd);
    // fretboardInstance.addCurrentSound(snd.soundId).addSoundMarksOnStrings();
  }

  function updateTuner(ac) {
    let errorUpdate = soundDataEvent.determine(false);
    errorUpdate = errorUpdate ? errorUpdate : ac;

    if (errorUpdate > -1)
      tun.update(new FrequencyMath(errorUpdate).getFrequencyError());
  }

  async function changeInput(id) {
    mic.changeInput(id);

    // "Have you tried turning it off and on again?"
    await mic.end();
    test.clearData();
    tun.clear();
    console.log("Restarting with new settings");
    await mic.setupStream();
    console.log(mic);
  }

  async function changeOutput(id, force) {
    mic.changeOutput(id);

    const audioOutput = document.querySelector("audio");

    if (force || audioOutput.srcObject) {
      const audioOutput = document.querySelector("audio");
      audioOutput.srcObject = mic.stream;
      audioOutput.setSinkId(id);
    }
  }

  async function changeDevice() {
    if (!mic.running) return;

    this.dir === Device.direction.input
      ? await changeInput(this.id)
      : await changeOutput(this.id);
  }

  // passed true = turn off, false = turn on, nothing = switch
  async function speakerToggleEvent() {
    const { speakerBut } = test.elements;
    const audio = document.querySelector("audio");
    if (test.speakerEnabled && mic.running) {
      test.buttonToggle(speakerBut, true);
      return (audio.srcObject = mic.stream);
    }

    test.buttonToggle(speakerBut, false);
    audio.srcObject = null;
  }

  // audioHandler instance
  let mic = new AudioHandler();

  // audioHandleTest instance - shows data in window
  const test = new audioTest(changeDevice, speakerToggleEvent);
  test.elements.micBut.element.onclick = mic.setupStream.bind(mic);

  const tun = new tuner();

  mic.on(AudioEvents.deviceChange, test.updateDeviceList.bind(test));

  mic.on(AudioEvents.audioProcessUpdate, (evt) => {
    const volume = evt.getWeightedVolume(2);
    //evt.volume(evt.BFDUint8());
    test.updateVolume(volume);

    const ac = evt.correlate();

    if (ac > -1) {
      // Add data to object as long as the correlation and signal are good
      soundDataEvent.add(ac);
      updateTuner();
    } else if (soundDataEvent.selfCheck() > 3)
      soundDataEvent.emit(AudioEvents.sampleLimit, soundDataEvent);
    else soundDataEvent.emptyData();
  });

  mic.on(AudioEvents.streamEnd, (evt) => {
    const { micBut, speakerBut } = test.elements;
    test.buttonToggle(micBut, false);
    test.buttonToggle(speakerBut, false);
    test.elements.micBut.element.onclick = evt.setupStream.bind(evt);
    test.speakerEnabled = false;
    test.clearData();
    tun.clear();
    soundDataEvent.emptyData();
    document.querySelector("audio").srcObject = null;
  });

  mic.on(AudioEvents.setupDone, async (evt) => {
    const { micBut } = test.elements;
    micBut.element.onclick = evt.end.bind(evt);
    test.buttonToggle(micBut, true);
  });

  soundDataEvent.on(AudioEvents.sampleLimit, (evt) => {
    updatePitch();
    evt.emptyData();
  });

  soundDataEvent.on(AudioEvents.sampleTarget, () => {
    updatePitch();
  });

  await test.updateDeviceList(mic);

  /*
    const fileHandler = new audioFileHandler({}, './controllers/audio/test.wav');
    await fileHandler.initCorrelation();
    (await fileHandler.createSource()).start(0);
    */

  // const fileHandler = new AudioFileHandler({}, "./ppa.wav");
  // await fileHandler.initCorrelation();
  // (await fileHandler.createSource()).start(0);
  //
  // fileHandler.on("ProcessedFileChunk", (evt) =>
  //   console.log(fileHandler.correlation.perform(evt))
  // );
  //
  // fileHandler.processEvent();

  /*fileHandler.processCallback(data => {
        const cor = fileHandler.correlation.perform(data);
        const fq = new frequencyMath(cor);

        console.log(cor);
        console.log(fq);
        console.log(fq.sound);
    });*/

  /*
    const fileHandler = new audioFileHandler({}, './controllers/audio/B3.wav');
    await fileHandler.initCorrelation();
    const content = [];
    await fileHandler.processCallback(data => content.push(fileHandler.correlation.perform(data)));
    fs.writeFile('./test/data/B3.json', JSON.stringify(content), () => {});
    */
};
