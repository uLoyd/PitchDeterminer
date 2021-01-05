class deviceHandler {
    currentInput = null;
    currentOutput = null;
    deviceChangeCallback = null;

    // callback -> deviceChangeCallback
    // updateList (bool) = true if update device list on initialization
    constructor(callback) {
        this.deviceChangeCallback = callback;

        const self = this; // copy of this to use inside the navigator

        navigator.mediaDevices.ondevicechange = function(event) {
            self.updateDeviceList();
        }
    }

    updateDeviceList() {
        let idArr = [];
        let curIn = this.currentInput;
        let curOut = this.currentOutput;

        const dev = navigator.mediaDevices.enumerateDevices(this.currentInput)
            .then(function(devices) {
                devices.forEach(function(device) {
                    const [kind, type, direction] = device.kind.match(/(\w+)(input|output)/i);

                    if (type === "audio") { // Checks only audio input. No use for video
                        if (direction === 'input' || direction === 'output') {
                            idArr.push({
                                id: device.deviceId,
                                label: device.label,
                                dir: direction
                            })

                            if (!curIn && direction === 'input') // If current output isn't set then set up the default one
                                curIn = device.deviceId;         // currentInput is used in constraint for getUserMedia
                                                                 // On users device change currentInput is being changed to
                                                                 // the deviceId and getUserMedia is called again using the
                                                                 // constraint with updated input device id

                            if (!curOut && direction === 'output') // Output won't be useful until adding backing tracks.
                                curOut = device.deviceId;          // Good to have this code here as a reminder tho.
                        }
                    }
                });
            })
            .then(() => {
                return {
                    in: curIn,
                    out: curOut
                };
            });

        // Save currently used devices and use callback
        dev.then((value) => {
            this.changeInput(value.in);
            this.changeOutput(value.out);
            this.deviceChangeCallback(idArr, curIn, curOut);
        });
    }

    changeInput(e) {
        //console.log(e);
        this.currentInput = e;
    }
    changeOutput(e) {
        //console.log(e);
        this.currentOutput = e;
    }

    // Return constrain for setting up the stream
    navigatorInput() {
        //console.log(this.currentInput ? { exact: this.currentInput } : undefined);
        return this.currentInput ? {
            exact: this.currentInput
        } : undefined;
    }
}

module.exports = deviceHandler;
