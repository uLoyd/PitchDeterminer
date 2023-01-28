const { Device } = require("../../customModules/audioModules");
module.exports = (function () {
  return [
    new Device(1, "test1", Device.direction.input),
    new Device(2, "test2", Device.direction.input),
    new Device(3, "test3", Device.direction.input),
    new Device(4, "test4", Device.direction.input),
    new Device(5, "test5", Device.direction.output),
    new Device(6, "test6", Device.direction.output),
    new Device(7, "test7", Device.direction.output),
    new Device(8, "test8", Device.direction.output),
  ];
})();
