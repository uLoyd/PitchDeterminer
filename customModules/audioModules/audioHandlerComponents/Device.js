'use strict';

class Device {
    // basically an enum
    static direction = {
        input: "input",
        output: "output",
    };

    constructor(id, label, dir) {
        if (typeof id === "object" && id !== null) {
            this.constructorForDeviceObject(id, label);
        } else {
            this.id = id;
            this.label = label;
            this.dir = dir;
            this.isInput = dir === Device.direction.input;
            this.isOutput = !this.isInput;
        }
    }

    constructorForDeviceObject(dev, dir) {
        this.id = dev.deviceId;
        this.label = dev.label;
        this.dir = dir;
        this.isInput = dir === Device.direction.input;
        this.isOutput = !this.isInput;
    }
}

module.exports = Device;
