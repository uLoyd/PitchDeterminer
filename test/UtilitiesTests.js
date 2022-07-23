const assert = require("assert");
const { utils } = require("../customModules/audioModules");

describe(`Utilities`, function () {
  function assertContainers(actual, expected, ExpectedType) {
    assert.ok(actual instanceof ExpectedType);

    for (let i = 0; i < actual.length; ++i) {
      assert.strictEqual(actual[i], expected[i]);
    }
  }
  it("convertToArrayBuffer for small data set returns ArrayBuffer", () => {
    const initialArray = [0, 1, 2, 3, 4];
    const actual = utils.convertToArrayBuffer(Uint8Array, initialArray, 10);
    assertContainers(actual, initialArray, ArrayBuffer);
  });

  it("convertToArrayBuffer for large data set returns ArrayBuffer", () => {
    const initialArray = [0, 1, 2, 3, 4];
    const actual = utils.convertToArrayBuffer(Uint8Array, initialArray, 2);
    assertContainers(actual, initialArray, ArrayBuffer);
  });

  it("fillDefaults will add missing properties", () => {
    const actual = {
      a: 1,
      b: 2,
    };
    const def = {
      a: 1,
      b: 2,
      c: 3,
    };
    const initial = Object.assign({}, actual);
    utils.fillDefaults(actual, def);

    assert.strictEqual(actual.a, initial.a);
    assert.strictEqual(actual.b, initial.b);
    assert.strictEqual(actual.c, def.c);
  });

  it("fillDefaults won't change existing properties to default ones if not requested", () => {
    const actual = {
      a: 1,
      b: 2,
    };
    const def = {
      a: 3,
      b: 4,
    };
    const initial = Object.assign({}, actual);
    utils.fillDefaults(actual, def);

    assert.strictEqual(actual.a, initial.a);
    assert.strictEqual(actual.b, initial.b);
  });

  it("fillDefaults will change existing properties to default ones if requested", () => {
    const actual = {
      a: 1,
      b: 2,
    };
    const def = {
      a: 3,
      b: 4,
    };
    utils.fillDefaults(actual, def, true);

    assert.strictEqual(actual.a, def.a);
    assert.strictEqual(actual.b, def.b);
  });

  it("fillDefaults won't remove properties that are absent in defaults", () => {
    const actual = {
      a: 1,
      b: 2,
      c: 3,
    };
    const def = {
      a: 1,
      b: 2,
    };
    const initial = Object.assign({}, actual);
    utils.fillDefaults(actual, def);

    assert.strictEqual(actual.a, initial.a);
    assert.strictEqual(actual.b, initial.b);
    assert.strictEqual(actual.c, initial.c);
  });
});
