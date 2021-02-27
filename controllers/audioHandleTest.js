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
    changeInput = null;

    constructor(changeInput, micToggleEvent) {
        this.changeInput = changeInput;

        this.elements = {
            lastNote: new htmlElement('lastNote'), // Initialize html elements data
            volume: new htmlElement('volume'),     // All the stuff there is just because of laziness
            audioIn: new htmlElement('audioIn'),
            audioOut: new htmlElement('audioOut'),
            micBut: new htmlElement('micBut')
        }

        this.elements.micBut.element.addEventListener('click', function() {
            micToggleEvent();
        });
    }

    emptyDevices() {
        this.elements.audioIn.content('');  // Empties devices list
        this.elements.audioOut.content(''); // Empties devices list
    }

    async createElement(target, id, dir, label) { // Creates an element to be added to the device list
        const elem = id + dir;
        const add = `<button id="${elem}" class='deviceButton'">${label}</button>`;
        await target.append(add);

        return elem;
    }

    micState(state) {
        this.elements.micBut.style([{ // Change the color of mic button
            key: 'background-color',
            value: (state ? 'red' : '#555')
        }]);
    }

    updateDeviceList(devArr) {
        this.emptyDevices();
        const callback = this.changeInput;

        devArr.forEach(async (entry) => {
            const target = (entry.dir === 'input' ? this.elements.audioIn : this.elements.audioOut);

            const elem = await this.createElement(target, entry.id, entry.dir, entry.label);

            if (entry.dir === 'output')
                return;

            document.getElementById(elem).addEventListener('click', function() {
                callback(entry.id);
            });
        });
    }

    async updateVolume(vol) {
        let volume = vol / 5;                 // Why divided by 5? It's a random value that works fine for now. Don't put too much attention to it.
        volume = volume < 100 ? volume : 100; // Stops the bar at 100 even if result is higher

        const color = (volume < 70 ? 'green' : (volume < 90 ? 'orange' : 'red'));

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