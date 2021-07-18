class htmlElement { // Redundant, created just for own convenience
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

    constructor(changeDevice, micToggleEvent) {
        this.changeDevice = changeDevice;

        this.elements = {
            lastNote: new htmlElement('lastNote'), // Initialize html elements data
            volume: new htmlElement('volume'),     // All the stuff there is just because of laziness
            audioIn: new htmlElement('audioIn'),
            audioOut: new htmlElement('audioOut'),
            micBut: new htmlElement('micBut')
        }

        this.elements.micBut.element.addEventListener('click', micToggleEvent);
    }

    emptyDevices() {
        this.elements.audioIn.content('');  // Empties devices list
        this.elements.audioOut.content(''); // Empties devices list
    }

    async createElement(target, id, dir, label, selected) { // Creates an element to be added to the device list
        const elem = id + dir;
        const style = selected ? "style='background-color: red;'" : "";
        const add = `<button id="${elem}" class='deviceButton' ${style}">${label}</button>`;
        target.append(add);
        //await target.append(add);

        return elem;
    }

    micState(state) {
        this.elements.micBut.style([{ // Change the color of mic button
            key: 'background-color',
            value: (state ? 'red' : '#555')
        }]);
    }

    updateDeviceList(devArr, currentInput, currentOutput) {
        this.emptyDevices();
        const callback = this.changeDevice;
        //const callbackOut = this.changeOutput;

        devArr.forEach(async (entry) => {
            const target = entry.dir === 'input' ? this.elements.audioIn : this.elements.audioOut;
            const selected = entry.dir === 'input' ? entry.id === currentInput?.id : entry.id === currentOutput?.id;
            const elem = await this.createElement(target, entry.id, entry.dir, entry.label, selected);

            document.getElementById(elem).addEventListener('click', function() {
                callback(entry);
            });
        });
    }

    async updateVolume(vol) {
        let volume = vol / 200 * (vol / 2); // Takes 200dB as max value reference and than "* vol / 2"
                                            // basically casts it into +- 0-100 range
                                            // It's completely empirical but the results are comparable
                                            // to my audio interface therefore I'll stick to that


        volume = volume < 100 ? volume : 100; // Stops the bar at 100 even if result is higher

        const color = (volume < 65 ? 'green' : (volume < 80 ? 'orange' : 'red'));

        this.elements.volume.style([{
            key: 'background-color',
            value: color
        }, {
            key: 'width',
            value: `${volume}%`
        }]);
    }

    async updatePitch(res) {
        if (res.note)                                                        // NaN can be passed here therefore a sanity check is needed
            this.elements.lastNote.content(`${res.note}${res.octave}`); // Update the displayed note
    }

    clearData() {
        this.updateVolume(0); // Clears volume bar
        this.updatePitch({    // Passing dummy object to don't show note
            note: "N/A",
            octave: ""
        });
    }
}


module.exports = audioHandleTest;