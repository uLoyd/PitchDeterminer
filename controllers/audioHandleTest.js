const { createDomElement } = require("../customModules/fretboard/utils");
const { Device } = require("../customModules/audioModules");

class htmlElement {
  // Redundant, created just for own convenience
  constructor(name) {
    this.element = document.getElementById(name);
  }
  content(cont) {
    //console.log(cont, this.element);
    this.element.innerHTML = cont;
  }
  append(cont) {
    this.element.innerHTML += cont;
  }
  style(data) {
    data.forEach((entry) => {
      this.element.style[entry.key] = entry.value;
    });
  }
}

class audioHandleTest {
  changeDevice = () => {};

  constructor(changeDevice, speakerToggleEvent) {
    this.changeDevice = changeDevice;

    this.elements = {
      lastNote: new htmlElement("lastNote"), // Initialize html elements data
      volume: new htmlElement("volume"), // All the stuff there is just because of laziness
      audioIn: new htmlElement("audioIn"),
      audioOut: new htmlElement("audioOut"),
      micBut: new htmlElement("micBut"),
      speakerBut: new htmlElement("speakerBut"),
    };

    this.speakerEnabled = false;

    this.elements.speakerBut.element.addEventListener("click", () => {
      this.speakerEnabled = !this.speakerEnabled;
      speakerToggleEvent();
    });

    return this;
  }

  emptyDevices() {
    this.elements.audioIn.content(""); // Empties devices list
    this.elements.audioOut.content(""); // Empties devices list
  }

  // true = add class; false = remove class;
  buttonToggle(button, state) {
    const classActive = "selectedDevice";
    state
      ? button.element.classList.add(classActive)
      : button.element.classList.remove(classActive);
  }

  async updateDeviceList(evt) {
    const devArr = await evt.deviceHandler.getDeviceList();
    const currentInput = evt.deviceHandler.currentInput;
    const currentOutput = evt.deviceHandler.currentOutput;

    this.emptyDevices();
    const callback = this.changeDevice;

    devArr.forEach((entry) => {
      const target =
        entry.dir === Device.direction.input
          ? this.elements.audioIn
          : this.elements.audioOut;
      const selected =
        entry.dir === Device.direction.input
          ? entry.id === currentInput?.id
          : entry.id === currentOutput?.id;

      const elem = createDomElement("button", ["deviceButton"], entry.label);

      target.element.appendChild(elem);

      if (selected) elem.classList.add("selectedDevice");

      elem.onclick = callback.bind(entry);
    });
  }

  async updateVolume(vol) {
    let volume = (vol / 200) * (vol / 2); // Takes 200dB as max value reference and than "* vol / 2"
    // basically casts it into +- 0-100 range
    // It's completely empirical but the results are comparable
    // to my audio interface therefore I'll stick to that

    volume = volume < 100 ? volume : 100; // Stops the bar at 100 even if result is higher

    const color = volume < 65 ? "green" : volume < 80 ? "orange" : "red";

    this.elements.volume.style([
      {
        key: "background-color",
        value: color,
      },
      {
        key: "width",
        value: `${volume}%`,
      },
    ]);
  }

  async updatePitch(res) {
    if (res.note)
      // NaN can be passed here therefore a sanity check is needed
      this.elements.lastNote.content(`${res.note}${res.octave}`); // Update the displayed note
  }

  clearData() {
    this.updateVolume(0); // Clears volume bar
    this.updatePitch({
      // Passing dummy object to don't show note
      note: "N/A",
      octave: "",
    });
  }
}

module.exports = audioHandleTest;
