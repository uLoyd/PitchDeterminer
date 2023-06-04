const {
    NavigatorInputConstraint,
} = require("../../customModules/audioModules");

module.exports = {
    setMockDevices: function (devices) {
        this.mediaDevices._devices = devices.map((dev) => {
            dev.kind = {
                match: function () {
                    return [null, "audio", dev.dir];
                },
            };
            dev.deviceId = dev.id;
            return dev;
        });
        return this;
    },
    mediaDevices: {
        _devices: [],
        getUserMedia: (receivedConstraint) => {
            return receivedConstraint;
        },
        enumerateDevices: function () {
            return this._devices;
        },
    },
};
