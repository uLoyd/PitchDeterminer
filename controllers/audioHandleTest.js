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
    micState = false;
    micCallback = null;

    addCallback(callback) { // can't do this in constructor as callback (micSwitch from render.js file) uses
                            // a method of this class therfore it needs to be added after an instance is created
        this.micCallback = callback; // callback handles mic switch(on / off). Returns bool: true = on, false = off;
    }

    constructor() {
        this.elements = {
            lastNote: new htmlElement('lastNote'), // Initialize html elements data
            volume: new htmlElement('volume'),     // All the stuff there is just because of laziness
            audioIn: new htmlElement('audioIn'),
            audioOut: new htmlElement('audioOut'),
            micBut: new htmlElement('micBut')
        }

        let self = this;
        this.elements.micBut.element.addEventListener('click', function() {
            self.toggleMic(self);
        });
    }

    toggleMic(self) {
        if (self.micState)
            self.emptyDevices(); // Empties device list when switching mic off

        self.elements.micBut.style([{ // Change the color of mic button
            key: 'background-color',
            value: (self.micState ? '#555' : 'red')
        }]);

        self.micState = !this.micState; // Change the state of mic

        self.micCallback(self.micState);
    }

    emptyDevices() {
        this.elements.audioIn.content('');  // Empties devices list
        this.elements.audioOut.content(''); // Empties devices list
    }

    async createElement(target, id, dir, label) { // Creates an element to be added to the device list
        const elem = id + dir;
        const add = `<button id="${elem}" class='deviceButton'">${label}</button>`;
        target.append(add);

        return elem;
    }

    // Adds element to device list
    devChange(entry, mic) {
        const target = (entry.dir === 'input' ? this.elements.audioIn : this.elements.audioOut); // Choose list of input or output devices

        this.createElement(target, entry.id, entry.dir, entry.label) // Creates element corresponding to found audio device inside list in DOM
            .then((elem) => {
                const retElem = document.getElementById(elem);

                // Adds onclick event to given element
                if (entry.dir === 'input') {
                    retElem.addEventListener('click', function() {
                        mic.changeInput(entry.id);
                    });
                }
            });
    }

    async updateVolume(vol) {
        let volume = vol / 5; // Why divided by 5? It's a random value that works fine for now.
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
        if (res.note) // NaN can be passed here therefore a sanity check is needed
            this.elements.lastNote.content(`${res.note}${res.octave}`); // Update the displayed note
    }
}


module.exports = audioHandleTest;
