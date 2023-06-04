"use strict";

class NavigatorInputConstraint {
    constructor(deviceId) {
        this.deviceId = deviceId;
    }

    audioConstraint(exactDeviceId) {
        return {
            audio: {
                deviceId: exactDeviceId,
            },
            video: false,
        };
    }

    get() {
        return this.audioConstraint(
            this.deviceId ? { exact: this.deviceId } : undefined
        );
    }
}

module.exports = NavigatorInputConstraint;
