const { createDomElement, uuidv4, optionSelect } = require("./utils");
const { Sound, sounds } = require("./Sound");
const { Fret } = require("./Fret");
const { Note } = require("./Note");

exports.StringLane = class StringLane {
  constructor(obj) {
    const {
      frets,
      tuning,
      tuningChange,
      octaveRange,
      octaveChange,
      onTuningChangeEvt,
      onOctaveChangeEvt,
      cssClasses,
      fretElemClasses,
      noteElemClasses,
      emptyStringClasses,
      callback,
    } = obj;

    this.id = uuidv4(); // StringLane has an id in case of two strings with the same sound and octave in 1 fretboard
    this.frets = frets;
    this.tuning = tuning;
    this.tuningElement = null;
    this.lane = null;
    this.tuningChange = tuningChange;
    this.onTuningChangeEvt = onTuningChangeEvt;
    this.fretInstances = [];
    this.octaveRange = octaveRange;
    this.octaveChange = octaveChange;
    this.onOctaveChangeEvt = onOctaveChangeEvt;
    this.callback = callback;

    this.elemClasses = {
      lane: cssClasses?.lane ?? ["row", "bg-dark", "fret_lane"],
      option: cssClasses?.option ?? [],
      tuningFixed: cssClasses?.tuningFixed ?? [
        "col",
        "bg-success",
        "fixed_tuning",
      ],
      octaveFixed: cssClasses?.octaveFixed ?? [
        "col",
        "bg-info",
        "fixed_octave",
      ],
    };

    this.fretElemClasses = fretElemClasses;
    this.noteElemClasses = noteElemClasses;
    this.emptyStringClasses = emptyStringClasses;

    return this;
  }

  create(target) {
    const { lane, option, tuningFixed, octaveFixed } = this.elemClasses;

    this.lane = createDomElement("div", lane);
    target.appendChild(this.lane);

    this.tuningElement = this.tuningChange
      ? optionSelect(this.tuning.sound, option, sounds, (opt) =>
          sounds.indexOf(opt)
        )
      : createDomElement("div", tuningFixed, this.tuning.sound);

    if (this.tuningChange)
      this.tuningElement.addEventListener("change", (evt) => {
        this.tuning = this.currentTuningValue();
        return this.onTuningChangeEvt(evt, this);
      });

    this.lane.appendChild(this.tuningElement);
    this.tuningElement.addEventListener("change", this.updateTuning);

    this.octaveElement = this.octaveChange
      ? optionSelect(this.tuning.octave, option, this.octaveRange, (opt) => opt)
      : createDomElement("div", octaveFixed, this.tuning.octave);

    if (this.octaveChange)
      this.octaveElement.addEventListener("change", (evt) => {
        this.tuning = this.currentTuningValue();
        this.onOctaveChangeEvt(evt, this);
      });

    this.lane.appendChild(this.octaveElement);

    this.fretInstances.push(
      new Fret(this.callback, this.emptyStringClasses).create(this.lane)
    );

    for (let i = 0; i < this.frets; i++)
      this.fretInstances.push(
        new Fret(this.callback, this.fretElemClasses).create(this.lane)
      );

    return this;
  }

  currentTuningValue() {
    const note =
      sounds[this.tuningElement.value] ?? this.tuningElement.innerText;
    const octave = this.octaveElement.value ?? this.octaveElement.innerText;

    return new Sound(note, octave);
  }

  updateTuning(evt) {
    this.tuning = evt.target.value;
  }

  findSoundPlace(soundIndex) {
    const places = [];
    if (!this.tuning) return;

    const currentTuning = sounds.indexOf(this.tuning.sound);
    const diff = currentTuning - soundIndex;
    let currentToPush = diff <= 0 ? Math.abs(diff) : 12 - diff;

    while (this.fretInstances.length > currentToPush) {
      places.push(currentToPush);
      currentToPush += 12;
    }

    return places;
  }

  // Sound's supposed to be Sound instance
  findSoundOctavePlace = (sound) => this.tuning.distanceBetweenNotes(sound);

  // Marks ALL SOUNDS regardless of their octave
  markSound(soundIndex, namingConvention) {
    const places = this.findSoundPlace(soundIndex);

    places.forEach((place) => {
      const dist = this.tuning.getDistanceFromNote() + place; // Distance of new sound = ( distance between A4 and this tuning ) + fretIndex
      const octave = Sound.getOctaveFromDistance(dist); // Gets octave of new sound
      const note = sounds[Sound.getNoteFromDistance(dist)]; // Gets symbol of new sound
      const sound = new Sound(note, octave); // Creates new sound
      const mark = new Note(
        sound,
        this.noteElemClasses,
        namingConvention
      ).create();
      this.fretInstances[place].noteMark(mark);
    });

    return this;
  }

  markExactSound(sound, namingConvention) {
    const place = this.findSoundOctavePlace(sound);

    if (place >= 0 && place <= this.frets)
      this.fretInstances[place].noteMark(
        new Note(sound, this.noteElemClasses, namingConvention).create()
      );

    return this;
  }

  removeMark(soundIndex) {
    this.findSoundPlace(soundIndex).forEach((place) =>
      this.fretInstances[place].clear()
    );

    return this;
  }

  clearAllFrets() {
    this.fretInstances.forEach((fret) => fret.clear());
    return this;
  }

  remove() {
    this.lane.innerHTML = "";
    return this;
  }
};
