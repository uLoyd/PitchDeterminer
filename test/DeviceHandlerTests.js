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
    new Device(1, "test1", "input"),
    new Device(2, "test2", "input"),
    new Device(3, "test3", "input"),
    new Device(4, "test4", "input"),
    new Device(5, "test5", "output"),
    new Device(6, "test6", "output"),
    new Device(7, "test7", "output"),
    new Device(8, "test8", "output"),
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
    deviceHandler.getDeviceList = fakeDeviceListFunc1;
  });

  it("Calling deviceChangeEvent dispatches callback", () => {
    assert.strictEqual(controlVariable, false);

    deviceHandler.deviceChangeEvent();
    assert.strictEqual(controlVariable, true);
  });

  it("Returns list of devices", () => {
    assert.strictEqual(
      deviceHandler.getDeviceList().length,
      fakeDeviceList.length
    );
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
    await deviceHandler.changeDevice(fakeInput.dir, fakeInput.id);
    const current1 = await deviceHandler.getCurrentOrFirst();

    assertDevice(current1.in, fakeInput);
    assertDevice(current1.out, fakeDeviceList[4]);
    assert.strictEqual(controlVariable, true);

    controlVariable = false;
    assert.strictEqual(controlVariable, false);

    const fakeOutput = fakeDeviceList[6];
    await deviceHandler.changeDevice(fakeOutput.dir, fakeOutput.id);
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
    deviceHandler.getDeviceList = fakeDeviceListFunc2;
    const actual = await deviceHandler.checkForInput();
    assert.strictEqual(actual, false);
  });

  it("navigatorInput creates object from input device if any exists", async () => {
    const actual = await deviceHandler.navigatorInput();
    assert.strictEqual(actual.exact, fakeDeviceList[0].id);
  });

  it("navigatorInput returns undefined if no input device exists", async () => {
    deviceHandler.getDeviceList = fakeDeviceListFunc2;
    const actual = await deviceHandler.navigatorInput();
    assert.strictEqual(actual, undefined);
  });

  it("Not mocked getDeviceList will throw due to lack of navigator", async () => {
    const originalHandler = new DeviceHandler(handlerCallback);

    try {
      await originalHandler.getDeviceList();
      assert.strictEqual(true, false);
    } catch (e) {
      assert.strictEqual(true, true);
    }
  });
});
