class Device {
  // basically an enum
  static direction = {
    input: "input",
    output: "output"
  }

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

class DeviceHandler {
  currentInput = null;
  currentOutput = null;
  deviceChangeCallback = () => {};

  // callback -> deviceChangeCallback
  constructor(callback) {
    if (callback) this.deviceChangeCallback = callback;

    try {
      navigator.mediaDevices.ondevicechange = this.deviceChangeEvent.bind(this);
    } catch (e) {}
  }

  deviceChangeEvent() {
    // console.log("Change of device occurred");

    this.deviceChangeCallback();
  }

  async getDeviceList() {
    const idArr = [];

    await navigator.mediaDevices.enumerateDevices().then(function (devices) {
      devices.forEach(function (dev) {
        const [kind, type, direction] = dev.kind.match(/(\w+)(input|output)/i);

        if (type === "audio")
          // Checks only audio input. No use for video
          idArr.push(new Device(dev, direction));
      });
    });

    return idArr;
  }

  // Returns currently set i/o devices or first matching device from device list
  async getCurrentOrFirst() {
    const devices = await this.getDeviceList();

    return {
      in: this.currentInput ?? devices.find((x) => x.isInput),
      out: this.currentOutput ?? devices.find((x) => x.isOutput),
    };
  }

  // e = device ID!
  async changeDevice(direction, deviceId) {
    const devList = await this.getDeviceList();
    const dev = deviceId
      ? devList.find((x) => x.id === deviceId && x.dir === direction)
      : devList.find((x) => x.dir === direction);

    direction === Device.direction.input ? (this.currentInput = dev) : (this.currentOutput = dev);

    this.deviceChangeCallback(
      await this.getDeviceList(),
      this.currentInput,
      this.currentOutput
    );
  }

  changeInput = async (deviceId) => await this.changeDevice(Device.direction.input, deviceId);

  changeOutput = async (deviceId) => await this.changeDevice(Device.direction.output, deviceId);

  // Returns bool. True - there's at least 1 input device available
  async checkForInput() {
    const devList = await this.getDeviceList();

    return devList.some((x) => x.isInput);
  }

  // Return constrain for setting up the stream
  async navigatorInput() {
    const device = await this.getCurrentOrFirst();

    return device.in
      ? {
          exact: device.in.id,
        }
      : undefined;
  }
}

module.exports.Device = Device;
module.exports.DeviceHandler = DeviceHandler;
