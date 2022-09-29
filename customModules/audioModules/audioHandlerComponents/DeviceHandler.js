"use strict";

const { Device } = require("../index");

class DeviceHandler {
  currentInput = null;
  currentOutput = null;
  deviceChangeCallback = () => {};

  constructor(callback) {
    if (callback) this.deviceChangeCallback = callback;

    try {
      navigator.mediaDevices.ondevicechange = this.deviceChangeEvent.bind(this);
    } catch (e) {
      console.error(
        `Problem with window.navigator.mediaDevices.ondevicechange event:\n${e}`
      );
    }
  }

  deviceChangeEvent() {
    // console.log("Change of device occurred");

    this.deviceChangeCallback();
  }

  async getFullDeviceList() {
    const idArr = [];

    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      const [kind, type, direction] = device.kind.match(/(\w+)(input|output)/i);

      if (type === "audio")
        // Checks only audio input. No use for video
        idArr.push(new Device(device, direction));
    });

    return idArr;
  }

  async getDeviceList(requestedDirection) {
    return (await this.getFullDeviceList()).filter(
      (device) => device.dir === requestedDirection
    );
  }

  // Returns currently set i/o devices or first matching device from device list
  async getCurrentOrFirst() {
    const devices = await this.getFullDeviceList();

    return {
      in: this.currentInput ?? devices.find((device) => device.isInput),
      out: this.currentOutput ?? devices.find((device) => device.isOutput),
    };
  }

  async changeDevice(direction, deviceId) {
    const devList = await this.getDeviceList(direction);
    const dev = devList.find((device) => device.id === (deviceId ?? device.id));

    direction === Device.direction.input
      ? (this.currentInput = dev)
      : (this.currentOutput = dev);

    this.deviceChangeCallback(
      await this.getFullDeviceList(),
      this.currentInput,
      this.currentOutput
    );
  }

  changeInput = async (deviceId) =>
    await this.changeDevice(Device.direction.input, deviceId);

  changeOutput = async (deviceId) =>
    await this.changeDevice(Device.direction.output, deviceId);

  // Returns bool. True - there's at least 1 input device available
  async checkForInput() {
    const devList = await this.getDeviceList(Device.direction.input);

    return !!devList.length;
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

module.exports = DeviceHandler;
