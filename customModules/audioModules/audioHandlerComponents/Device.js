"use strict";

class Device {
    // basically an enum
    static direction = {
        input: "input",
        output: "output",
    };

    static type = {
        audio: "audio",
        video: "video",
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

    copy() {
        return new Device(this.id, this.label, this.dir);
    }
}

module.exports = Device;
