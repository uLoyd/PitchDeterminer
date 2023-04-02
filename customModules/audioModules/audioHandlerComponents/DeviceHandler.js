"use strict";

const { Device } = require("../index");

class DeviceHandler {
  currentInput = null;
  currentOutput = null;
  deviceChangeCallback = () => {};
  cachedDevices_ = [];

  constructor(callback) {
    if (callback) this.deviceChangeCallback = callback;

    try {
      this.navigator = navigator;
      this.navigator.mediaDevices.ondevicechange =
        this.deviceChangeEvent.bind(this);
    } catch (e) {
      console.error(
        `Problem with window.navigator.mediaDevices.ondevicechange event:\n${e}`
      );
    }
  }

  async updateDeviceList() {
    this.cachedDevices_ = [];
    const devices = await this.navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      const [kind, type, direction] = device.kind.match(/(\w+)(input|output)/i);
      if (type === Device.type.audio)
        this.cachedDevices_.push(new Device(device, direction));
    });
  }

  async deviceChangeEvent() {
    // console.log("Change of device occurred");
    await this.updateDeviceList();
    this.deviceChangeCallback(
      this.getFullDeviceList(),
      this.currentInput?.copy(),
      this.currentOutput?.copy()
    );
  }

  getFullDeviceList() {
    return [...this.cachedDevices_].map((device) => device.copy());
  }

  getDeviceList(requestedDirection) {
    return this.cachedDevices_
      .filter((device) => device.dir === requestedDirection)
      .map((device) => device.copy());
  }

  // Returns currently set i/o devices or first matching device from device list
  getCurrentOrFirst() {
    return {
      in:
        this.currentInput ??
        this.cachedDevices_.find((device) => device.isInput)?.copy(),
      out:
        this.currentOutput ??
        this.cachedDevices_.find((device) => device.isOutput)?.copy(),
    };
  }

  changeDevice(direction, deviceId) {
    const devList = this.getDeviceList(direction);
    const dev = devList
      .find((device) => device.id === (deviceId ?? device.id))
      ?.copy();

    if (!dev) {
      console.warn(
        `No device with ID: ${deviceId} found in direction: ${direction}`
      );
      return;
    }

    direction === Device.direction.input
      ? (this.currentInput = dev)
      : (this.currentOutput = dev);

    this.deviceChangeCallback(
      this.getFullDeviceList(),
      this.currentInput,
      this.currentOutput
    );
  }

  changeInput = (deviceId) =>
    this.changeDevice(Device.direction.input, deviceId);

  changeOutput = (deviceId) =>
    this.changeDevice(Device.direction.output, deviceId);

  // Returns bool. True - there's at least 1 input device available
  checkForInput() {
    const devList = this.getDeviceList(Device.direction.input);
    return !!devList.length;
  }

  // Return constrain for setting up the stream
  navigatorInput() {
    const device = this.getCurrentOrFirst();

    return device.in
      ? {
          exact: device.in.id,
        }
      : undefined;
  }
}

module.exports = DeviceHandler;
