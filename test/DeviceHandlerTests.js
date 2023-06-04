const assert = require("assert");
const assertion = require("./utilities/Assertion");
const fakeDeviceList = require("./utilities/FakeDeviceList");
const NavigatorMock = require("./utilities/NavigatorMock");
const {
    Device,
    DeviceHandler,
} = require("../customModules/audioModules/index");
const DeviceTestData = require("./data/DeviceData");

DeviceTestData.forEach((deviceData) => {
    describe(`${deviceData.name} is correctly created`, () => {
        const deviceParams = deviceData.data;

        it("Device is correctly created from object", () => {
            assertion.iterableOfObjectsPropsEqual(
                new Device(deviceParams, deviceParams.dir),
                deviceParams
            );
        });

        it("Device is correctly created from arguments", () => {
            assertion.iterableOfObjectsPropsEqual(
                new Device(
                    deviceParams.deviceId,
                    deviceParams.label,
                    deviceParams.dir
                ),
                deviceParams
            );
        });
    });
});

describe(`DeviceHandler:`, () => {
    let controlVariable = false;
    let handlerCallback = function () {
        controlVariable = true;
    };
    let deviceHandler;

    beforeEach(async () => {
        controlVariable = false;
        deviceHandler = new DeviceHandler(handlerCallback, NavigatorMock);
        deviceHandler.navigator.setMockDevices(fakeDeviceList);
        await deviceHandler.updateDeviceList();
    });

    it("Calling deviceChangeEvent dispatches callback", async () => {
        assert.strictEqual(controlVariable, false);
        await deviceHandler.deviceChangeEvent();
        assert.strictEqual(controlVariable, true);
    });

    it("Returns list of devices", () => {
        const devList = deviceHandler.getFullDeviceList();
        assert.strictEqual(devList.length, fakeDeviceList.length);
    });

    it("Returns list of input devices", () => {
        const devList = deviceHandler.getDeviceList(Device.direction.input);
        assert.strictEqual(devList.length, 4);
    });

    it("Returns list of output devices", () => {
        const devList = deviceHandler.getDeviceList(Device.direction.output);
        assert.strictEqual(devList.length, 4);
    });

    it("getCurrentOrFirst returns first device if none is set", () => {
        const current = deviceHandler.getCurrentOrFirst();
        assertion.iterableOfObjectsPropsEqual(current.input, fakeDeviceList[0]);
        assertion.iterableOfObjectsPropsEqual(
            current.output,
            fakeDeviceList[4]
        );
    });

    it("getCurrentOrFirst returns current devices if those are set", () => {
        deviceHandler.currentInput = fakeDeviceList[3];
        deviceHandler.currentOutput = fakeDeviceList[7];
        const current = deviceHandler.getCurrentOrFirst();
        assertion.iterableOfObjectsPropsEqual(current.input, fakeDeviceList[3]);
        assertion.iterableOfObjectsPropsEqual(
            current.output,
            fakeDeviceList[7]
        );
    });

    it("changeDevice dispatches callback and sets correct device", () => {
        assert.strictEqual(controlVariable, false);

        const fakeInput = fakeDeviceList[2];
        deviceHandler.changeInput(fakeInput.id);
        const current1 = deviceHandler.getCurrentOrFirst();

        assertion.iterableOfObjectsPropsEqual(current1.input, fakeInput);
        assertion.iterableOfObjectsPropsEqual(
            current1.output,
            fakeDeviceList[4]
        );
        assert.strictEqual(controlVariable, true);

        controlVariable = false;
        assert.strictEqual(controlVariable, false);

        const fakeOutput = fakeDeviceList[6];
        deviceHandler.changeOutput(fakeOutput.id);
        const current2 = deviceHandler.getCurrentOrFirst();

        assertion.iterableOfObjectsPropsEqual(current2.input, fakeInput);
        assertion.iterableOfObjectsPropsEqual(current2.output, fakeOutput);
        assert.strictEqual(controlVariable, true);
    });

    it("checkForInput returns true if there are input devices in list", () => {
        const actual = deviceHandler.checkForInput();
        assert.strictEqual(actual, true);
    });

    it("checkForInput returns false if there are no input devices in list", async () => {
        deviceHandler.navigator = NavigatorMock.setMockDevices([]);
        await deviceHandler.updateDeviceList();
        const actual = deviceHandler.checkForInput();
        assert.strictEqual(actual, false);
    });

    it("navigatorInput creates object from input device if any exists", () => {
        const actual = deviceHandler.navigatorInput();
        assert.strictEqual(actual.exact, fakeDeviceList[0].id);
    });

    it("navigatorInput returns undefined if no input device exists", async () => {
        deviceHandler.navigator = NavigatorMock.setMockDevices([]);
        await deviceHandler.updateDeviceList();
        const actual = deviceHandler.navigatorInput();
        assert.strictEqual(actual, undefined);
    });

    it("Changing devices returned from getFullDeviceList won't affect the actual cachedDevices", () => {
        const originalDevice = deviceHandler.cachedDevices_[0];
        assert.strictEqual(originalDevice.id, 1);
        const deviceFromList = deviceHandler.getFullDeviceList()[0];
        assert.strictEqual(deviceFromList.id, 1);

        deviceFromList.id = 123;
        assert.strictEqual(originalDevice.id, 1);
        assert.strictEqual(deviceFromList.id, 123);
    });

    it("Changing devices returned from getDeviceList won't affect the actual cachedDevices", () => {
        const originalDevice = deviceHandler.cachedDevices_[0];
        assert.strictEqual(originalDevice.id, 1);
        const deviceFromList = deviceHandler.getDeviceList(
            Device.direction.input
        )[0];
        assert.strictEqual(deviceFromList.id, 1);

        deviceFromList.id = 123;
        assert.strictEqual(originalDevice.id, 1);
        assert.strictEqual(deviceFromList.id, 123);
    });

    it("Changing device id returned from navigatorInput won't affect the actual cached device", () => {
        const originalDevice = deviceHandler.cachedDevices_[0];
        assert.strictEqual(originalDevice.id, 1);
        const navigatorInput = deviceHandler.navigatorInput();
        assert.strictEqual(navigatorInput.exact, 1);

        navigatorInput.exact = 123;
        assert.strictEqual(originalDevice.id, 1);
        assert.strictEqual(navigatorInput.exact, 123);
    });

    it("New device handler without navigator and not accessible window will throw", () => {
        const deviceHandlerCreator = (args) => { return new DeviceHandler(...args); };
        assertion.willThrow(deviceHandlerCreator, []);
    })

    it("changeDevice won't change device if given ID is not found", () => {
        const initialDevices = deviceHandler.getCurrentOrFirst();
        const actualInput = initialDevices.input.copy();
        const actualOutput = initialDevices.output.copy();
        deviceHandler.changeDevice(Device.direction.input, "Non existent ID");
        deviceHandler.changeDevice(Device.direction.output, "Non existent ID");
        const dataAfterChange = deviceHandler.getCurrentOrFirst();
        assertion.iterableOfObjectsPropsEqual([actualInput], [dataAfterChange.input]);
        assertion.iterableOfObjectsPropsEqual([actualOutput], [dataAfterChange.output]);
    });
});
