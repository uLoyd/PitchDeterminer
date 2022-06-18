const {Device} = require("../../customModules/audioModules");
module.exports = [
  {
    name: "Input Device",
    data: {
      deviceId: 1,
      label: "test1",
      dir: Device.direction.input,
      isInput: true,
      isOutput: false,
    },
  },
  {
    name: "Output Device",
    data: {
      deviceId: 2,
      label: "test2",
      dir: Device.direction.output,
      isInput: false,
      isOutput: true,
    },
  },
];
