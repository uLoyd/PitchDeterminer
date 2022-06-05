const { Sound, sounds } = require("./Sound");
const { StringLane } = require("./StringLane");
const { Tuning } = require("./Tuning");
const { createDomElement } = require("./utils");

exports.Fretboard = class Fretboard {
  constructor(obj) {
    const {
      frets,
      tuning,
      container,
      onTuningChangeEvt,
      onOctaveChangeEvt,
      fretsClick,
      octaveRange,
      stringLaneElemClasses,
      fretElemClasses,
      noteElemClasses,
      emptyStringClasses,
      namingConvention,
    } = obj;

    this.frets = frets;
    this.stringInstances = [];
    this.domElement = container;
    //this.currentScale = null;
    this.currentSounds = new Array(12).fill(false); // Meant for sounds in all octaves
    this.currentExactSounds = []; // Meant for Sound instances as those specify the exact octave
    this.tuning = new Tuning(tuning);
    this.allowTuningChange = !!onTuningChangeEvt;
    this.onTuningChangeEvt = onTuningChangeEvt ?? function () {}; // just an empty function to replace missing callback
    this.allowOctaveChange = !!onOctaveChangeEvt;
    this.onOctaveChangeEvt = onOctaveChangeEvt ?? function () {}; // just an empty function to replace missing callback
    this.fretsClick = fretsClick ?? function () {}; // just an empty function to replace missing callback
    this.octaveRange = [4]; // 4 is just a random placeholder. If nothing would be passed
    // here it'd be the only possible option for every "string" to
    // be in 4th octave indefinitely

    this.stringLaneElemClasses = stringLaneElemClasses;
    this.fretElemClasses = fretElemClasses;
    this.noteElemClasses = noteElemClasses;
    this.emptyStringClasses = emptyStringClasses;
    this.namingConvention = namingConvention;

    if (octaveRange) {
      this.octaveRange.pop(); // Throws out the default value

      for (let i = octaveRange.min; i <= octaveRange.max; i++)
        this.octaveRange.push(i);
    }

    return this;
  }

  create(marks) {
    this.fretboardElement = createDomElement("div");
    this.domElement.appendChild(this.fretboardElement);

    this.tuning.sounds.forEach((sound) => this.addString(sound));

    if (!marks) return this;

    // lane used for representing fret numbers
    const lane = new StringLane({
      frets: 12,
      tuningChange: this.allowTuningChange,
      octaveChange: this.allowOctaveChange,
      tuning: new Sound(null, null),
      octaveRange: [1],
      fretElemClasses: ["col", "d-flex", "justify-content-center"],
      emptyStringClasses: ["col", "d-flex", "justify-content-center"],
    });
    lane.create(this.domElement);
    lane.tuningElement.style.visibility = "hidden";
    lane.octaveElement.style.visibility = "hidden";

    marks.forEach(
      (mark) => (lane.fretInstances[mark].domElement.innerText = mark)
    );

    return this;
  }

  // Sound instance of strings tuning that will get appended to the bottom of displayed fretboard
  // Returns stringLane instance
  addString(sound, create = true, addToTuning = false) {
    if (addToTuning) this.tuning.sounds.push(sound);

    const {
      frets,
      allowTuningChange,
      octaveRange,
      allowOctaveChange,
      onTuningChangeEvt,
      onOctaveChangeEvt,
      fretsClick,
      stringLaneElemClasses,
      fretElemClasses,
      noteElemClasses,
      emptyStringClasses,
    } = this;

    const lane = new StringLane({
      frets,
      tuning: sound,
      tuningChange: allowTuningChange,
      octaveRange,
      octaveChange: allowOctaveChange,
      onTuningChangeEvt,
      onOctaveChangeEvt,
      callback: fretsClick,
      cssClasses: stringLaneElemClasses ?? {},
      fretElemClasses,
      noteElemClasses,
      emptyStringClasses,
    });

    if (create) lane.create(this.fretboardElement);

    this.stringInstances.push(lane);

    return lane;
  }

  removeFretboard() {
    this.stringInstances = [];
    this.domElement.innerHTML = "";

    return this;
  }

  // string - stringLane instance
  // returns stringLane instance index in stringInstances array
  findStringIndex = (string) =>
    this.stringInstances.findIndex((x) => x.id === string.id);

  // string - stringLane instance
  removeString(string, removeDom = true, removeFromTuning = true) {
    const index = this.findStringIndex(string);

    if (index < 0) return this;

    if (removeDom) string.remove();

    this.stringInstances.splice(index, 1);

    if (removeFromTuning) this.tuning.sounds.splice(index, 1);

    return this;
  }

  // alternative to removeString method in case of using string index from stringInstances array instead of instance itself
  removeStringByIndex = (index, removeDom = true, removeFromTuning = true) =>
    this.removeString(this.stringInstances[index], removeDom, removeFromTuning);

  #changeCurrentSound(soundIndex, value) {
    this.currentExactSounds
      .filter((x) => x.sound === sounds[soundIndex])
      .forEach((sound) => this.removeCurrentExactSound(sound));
    this.currentSounds[soundIndex] = value;
    return this;
  }

  addCurrentSound(soundIndex) {
    return this.#changeCurrentSound(soundIndex, true);
  }

  removeCurrentSound(soundIndex) {
    return this.#changeCurrentSound(soundIndex, false);
  }

  switchCurrentSound(soundIndex) {
    this.currentSounds[soundIndex]
      ? this.removeCurrentSound(soundIndex)
      : this.addCurrentSound(soundIndex);
    return this;
  }

  findCurrentExactSound = (sound) =>
    this.currentExactSounds.find((x) => x.toString() === sound.toString());

  findCurrentExactSoundIndex = (sound) =>
    this.currentExactSounds.findIndex((x) => x.toString() === sound.toString());

  // Sound's supposed to be Sound instance
  addCurrentExactSound(sound) {
    const foundSound = this.findCurrentExactSound(sound);

    if (!foundSound) this.currentExactSounds.push(sound);

    return this;
  }

  removeCurrentExactSound(sound) {
    const foundSound = this.findCurrentExactSoundIndex(sound);

    if (foundSound !== -1) this.currentExactSounds.splice(foundSound, 1);

    return this;
  }

  // Removes "sound" both from general sound array (currentSounds) and exact sound array (currentExactSounds)
  // based on soundIndex. It will remove ALL instances of sound regardless of octave
  removeSoundAll(soundIndex) {
    this.removeCurrentSound(soundIndex);

    const exacts = this.currentExactSounds.filter(
      (x) => x.sound === sounds[soundIndex]
    );
    exacts.forEach((sound) => this.removeCurrentExactSound(sound));

    return this;
  }

  switchCurrentExactSound(sound) {
    const foundSound = this.findCurrentExactSound(sound);

    return foundSound
      ? this.removeCurrentExactSound(sound)
      : this.addCurrentExactSound(sound);
  }

  addExactSoundMarksOnStrings(sound, addToCurrent = true) {
    if (addToCurrent) this.addCurrentExactSound(sound);

    this.stringInstances.forEach((string) => {
      string.findSoundOctavePlace(sound);
    });

    return this;
  }

  // Creates "marks" of sounds on corresponding frets. Shows the scale on fretboard in short.
  // Adds sound marks for EVERY sound on ALL strings!
  addSoundMarksOnStrings() {
    this.stringInstances.forEach((string) =>
      this.addSoundMarksOnString(string)
    );

    return this;
  }

  // Index of a string same as in the "tuning" array passed to Fretboard class constructor
  // StringLane instance is passed to addSoundMarksOnString which then returns Fretboard instance
  addSoundMarksOnStringIndex(stringIndex) {
    const string = this.stringInstances[stringIndex];
    return this.addSoundMarksOnString(string);
  }

  // Adds sound marks on one specific string. "string" parameter is a StringLane instance
  addSoundMarksOnString(string) {
    string.clearAllFrets();

    this.currentSounds.forEach((sound, index) => {
      if (sound) string.markSound(index, this.namingConvention);
    });

    this.currentExactSounds.forEach((sound) =>
      string.markExactSound(sound, this.namingConvention)
    );

    return this;
  }

  // Iterates through strings adding / removing sound.
  // If sound passed in argument is currently "marked" in current position it will remove it and vice versa
  // --------------------------------
  // It's useful ONLY for sounds that were added globally (on all strings through addSoundMarksOnStrings method)
  // otherwise if let's say sound was added on one specific fret it will remove it
  // from this exact location and add it in all other ones!
  switchSoundOnOff(sound) {
    const index = sounds.indexOf(sound);
    this.currentSounds[index] = !this.currentSounds[index];

    const exacts = this.currentExactSounds.filter(
      (x) => x.sound === sounds[index]
    );
    exacts.forEach((sound) =>
      this.currentSounds[index]
        ? this.addCurrentExactSound(sound)
        : this.removeCurrentExactSound(sound)
    );

    this.stringInstances.forEach((string) =>
      this.currentSounds[index]
        ? string.markSound(index, this.namingConvention)
        : string.removeMark(index)
    );

    return this;
  }

  changeNamingConvention(convention, reload = true) {
    if (this.namingConvention === convention) return this;

    this.namingConvention = convention;

    if (reload) this.clearAllFrets().addSoundMarksOnStrings();

    return this;
  }

  getStringLanesTuning() {
    return new Tuning(
      this.stringInstances.map((lane) => lane.currentTuningValue())
    );
  }

  clearAllFrets() {
    this.stringInstances.forEach((string) => string.clearAllFrets());
    return this;
  }
};
