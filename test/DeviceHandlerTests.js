const assert = require("assert");
const {
  Device,
  DeviceHandler,
} = require("../customModules/audioModules/index");
const DeviceTestData = require("./data/DeviceData");

DeviceTestData.forEach((deviceData) => {
  const assertDevice = (actual, expected) => {
    assert.strictEqual(actual.id, expected.deviceId);
    assert.strictEqual(actual.label, expected.label);
    assert.strictEqual(actual.dir, expected.dir);
    assert.strictEqual(actual.isInput, expected.isInput);
    assert.strictEqual(actual.isOutput, expected.isOutput);
  };

  describe(`${deviceData.name} is correctly created`, () => {
    const deviceParams = deviceData.data;

    it("Device is correctly created from object", () => {
      assertDevice(new Device(deviceParams, deviceParams.dir), deviceParams);
    });

    it("Device is correctly created from arguments", () => {
      assertDevice(
        new Device(deviceParams.deviceId, deviceParams.label, deviceParams.dir),
        deviceParams
      );
    });
  });
});

describe(`DeviceHandler:`, () => {
  const assertDevice = (actual, expected) => {
    assert.strictEqual(actual.id, expected.id);
    assert.strictEqual(actual.label, expected.label);
    assert.strictEqual(actual.dir, expected.dir);
    assert.strictEqual(actual.isInput, expected.isInput);
    assert.strictEqual(actual.isOutput, expected.isOutput);
  };

  let controlVariable = false;
  let handlerCallback = function () {
    controlVariable = true;
  };
  let deviceHandler;
  const fakeDeviceList = [
    new Device(1, "test1", Device.direction.input),
    new Device(2, "test2", Device.direction.input),
    new Device(3, "test3", Device.direction.input),
    new Device(4, "test4", Device.direction.input),
    new Device(5, "test5", Device.direction.output),
    new Device(6, "test6", Device.direction.output),
    new Device(7, "test7", Device.direction.output),
    new Device(8, "test8", Device.direction.output),
  ];
  const fakeDeviceListFunc1 = function () {
    return fakeDeviceList;
  };
  const fakeDeviceListFunc2 = function () {
    return [];
  };

  beforeEach(() => {
    controlVariable = false;
    deviceHandler = new DeviceHandler(handlerCallback);
    deviceHandler.getFullDeviceList = fakeDeviceListFunc1;
  });

  it("Calling deviceChangeEvent dispatches callback", () => {
    assert.strictEqual(controlVariable, false);

    deviceHandler.deviceChangeEvent();
    assert.strictEqual(controlVariable, true);
  });

  it("Returns list of devices", async () => {
    const devList = await deviceHandler.getFullDeviceList();
    assert.strictEqual(devList.length, fakeDeviceList.length);
  });

  it("Returns list of input devices", async () => {
    const devList = await deviceHandler.getDeviceList(Device.direction.input);
    assert.strictEqual(devList.length, 4);
  });

  it("Returns list of output devices", async () => {
    const devList = await deviceHandler.getDeviceList(Device.direction.output);
    assert.strictEqual(devList.length, 4);
  });

  it("getCurrentOrFirst returns first device if none is set", async () => {
    const current = await deviceHandler.getCurrentOrFirst();
    assertDevice(current.in, fakeDeviceList[0]);
    assertDevice(current.out, fakeDeviceList[4]);
  });

  it("getCurrentOrFirst returns current devices if those are set", async () => {
    deviceHandler.currentInput = fakeDeviceList[3];
    deviceHandler.currentOutput = fakeDeviceList[7];
    const current = await deviceHandler.getCurrentOrFirst();
    assertDevice(current.in, fakeDeviceList[3]);
    assertDevice(current.out, fakeDeviceList[7]);
  });

  it("changeDevice dispatches callback and sets correct device", async () => {
    assert.strictEqual(controlVariable, false);

    const fakeInput = fakeDeviceList[2];
    await deviceHandler.changeInput(fakeInput.id);
    const current1 = await deviceHandler.getCurrentOrFirst();

    assertDevice(current1.in, fakeInput);
    assertDevice(current1.out, fakeDeviceList[4]);
    assert.strictEqual(controlVariable, true);

    controlVariable = false;
    assert.strictEqual(controlVariable, false);

    const fakeOutput = fakeDeviceList[6];
    await deviceHandler.changeOutput(fakeOutput.id);
    const current2 = await deviceHandler.getCurrentOrFirst();

    assertDevice(current2.in, fakeInput);
    assertDevice(current2.out, fakeOutput);
    assert.strictEqual(controlVariable, true);
  });

  it("checkForInput returns true if there are input devices in list", async () => {
    const actual = await deviceHandler.checkForInput();
    assert.strictEqual(actual, true);
  });

  it("checkForInput returns false if there are no input devices in list", async () => {
    deviceHandler.getFullDeviceList = fakeDeviceListFunc2;
    const actual = await deviceHandler.checkForInput();
    assert.strictEqual(actual, false);
  });

  it("navigatorInput creates object from input device if any exists", async () => {
    const actual = await deviceHandler.navigatorInput();
    assert.strictEqual(actual.exact, fakeDeviceList[0].id);
  });

  it("navigatorInput returns undefined if no input device exists", async () => {
    deviceHandler.getFullDeviceList = fakeDeviceListFunc2;
    const actual = await deviceHandler.navigatorInput();
    assert.strictEqual(actual, undefined);
  });

  it("Not mocked getFullDeviceList will throw due to lack of navigator", async () => {
    const originalHandler = new DeviceHandler(handlerCallback);

    try {
      await originalHandler.getFullDeviceList();
      assert.strictEqual(true, false);
    } catch (e) {
      assert.strictEqual(true, true);
    }
  });
});
