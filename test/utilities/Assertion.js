const assert = require("assert");

class NumberAssert {
  constructor(value) {
    if (isNaN(value)) assert.ok(false, `${value} is not a number`);

    this.value = value;
  }

  isPositive(errMsg = `${this.value} is not a positive number`) {
    assert.ok(this.value > 0, errMsg);
  }

  isNegative(errMsg = `${this.value} is not a positive number`) {
    assert.ok(this.value < 0, errMsg);
  }

  isZero(errMsg = `${this.value} is not equal to 0`) {
    assert.strictEqual(this.value === 0, errMsg);
  }

  isSoftZero(errMsg = `${this.value} is not equal to 0`) {
    assert.ok(this.value === 0 || this.value === -0, errMsg);
  }

  isInRange(
    lowerBound,
    upperBound,
    errMsg = `${this.value} is not in range ${lowerBound} - ${upperBound}`
  ) {
    const inRange =
      (this.value >= new NumberAssert(lowerBound).value) &&
      (this.value <= new NumberAssert(upperBound).value);
    assert.ok(inRange, errMsg);
  }
}

class IterableAssert {
  constructor(value) {
    this.isIterable(value);
    this.value = value;
  }

  isTypedArray(arr) {
    const TypedArray = Object.getPrototypeOf(arr);
    return (obj) => obj instanceof TypedArray;
  }

  isIterable(value, errMsg = `${value} is not iterable`) {
    assert.ok(
      typeof value[Symbol.iterator] === "function" || this.isTypedArray(value),
      errMsg
    );
  }
}

class CallObject {
  _control = 0;
  _errMsg = "";
  _calls = 1;

  constructor(errMsg, calls = 1) {
    this._errMsg = errMsg;
    this._calls = calls;
  }

  callback() {
    ++this._control;
    if (this._control > this._calls)
      assert.ok(false, `Function called more than ${this._calls} times`);
  }
  assert() {
    assert.ok(this._control === this._calls, this._errMsg);
  }
}

const assertion = {
  _twoElementErrorMsg: (el1, el2) => {
    return `Inequality: First element: ${el1} and second element${el2}`;
  },

  _ObjKeyErrorMsg: (key, value, expected) => {
    return `Inequality: First element: ${key} equal to ${value} to expected: ${expected}`;
  },

  isPositive: function (value, errMsg) {
    new NumberAssert(value).isPositive(errMsg);
  },

  isNegative: function (value, errMsg) {
    new NumberAssert(value).isNegative(errMsg);
  },

  isZero: function (value, errMsg) {
    new NumberAssert(value).isZero(errMsg);
  },

  isSoftZero: function (value, errMsg) {
    new NumberAssert(value).isSoftZero(errMsg);
  },

  isInRange(value, lowerBound, upperBound, errMsg) {
    new NumberAssert(value).isInRange(lowerBound, upperBound, errMsg);
  },

  isArray: (value, errMsg = `${value} is not an Array`) =>
    assert.ok(Array.isArray(value), errMsg),

  _isTypedArray: (arr) => {
    const TypedArray = Object.getPrototypeOf(arr);
    return (obj) => obj instanceof TypedArray;
  },

  isTypedArray: function (value, errMsg = `${value} is not a Typed Array`) {
    assert.ok(this._isTypedArray(value), errMsg);
  },

  isIterable: function (value, errMsg = `${value} is not iterable`) {
    assert.ok(
      typeof value[Symbol.iterator] === "function" || this._isTypedArray(value),
      errMsg
    );
  },

  every: function (arr, predicate, errMsg) {
    this.isIterable(arr);
    arr.every((elem) => assert.ok(predicate(elem, errMsg)));
  },

  everyKey: function (arr, expected, errMsg = this._ObjKeyErrorMsg) {
    for (const key of Object.keys(arr))
      expected instanceof Function
        ? assert.ok(expected(key), errMsg(key, arr[key], expected))
        : assert.strictEqual(arr[key], errMsg(key, arr[key], expected));
  },

  iterableStrictEqual: function (
    arr1,
    arr2,
    errMsg = this._twoElementErrorMsg
  ) {
    this.isIterable(arr1);
    this.isIterable(arr2);

    for (let i = 0; i < arr1.length; ++i)
      assert.strictEqual(arr1[i], arr2[i], errMsg(arr1[i], arr2[i]));
  },

  iterableOfObjectsPropsIncludes: function (
    arr1,
    arr2,
    errMsg = this._twoElementErrorMsg
  ) {
    this.isIterable(arr1);
    this.isIterable(arr2);

    for (let i = 0; i < arr1.length; ++i) {
      for (const key of Object.keys(arr1[i]))
        assert.ok(
          arr1[i][key] === arr2[i][key],
          errMsg(arr1[i][key], arr2[i][key])
        );
    }
  },

  iterableOfObjectsPropsEqual: function (
    arr1,
    arr2,
    errMsg = this._twoElementErrorMsg
  ) {
    this.isIterable(arr1);
    this.isIterable(arr2);

    for (let i = 0; i < arr1.length; ++i) {
      assert.strictEqual(
        Object.keys(arr1[i]).length,
        Object.keys(arr2[i]).length,
        `Object ${arr1[i]} and ${arr2[i]} have different amount of properties`
      );

      for (const key of Object.keys(arr1[i]))
        assert.ok(
          arr1[i][key] === arr2[i][key],
          errMsg(arr1[i][key], arr2[i][key])
        );
    }
  },

  willThrow: async function (
    callback,
    params,
    errMsg = `${callback} did not throw an exception`
  ) {
    try {
      await callback(...params);
      assert.ok(false, errMsg);
    } catch (e) {
      assert.ok(true);
    }
  },

  willThrowWithMessage: async function (
    callback,
    params,
    errorMessage,
    errMsg = `${callback} did not throw an exception, or the error message doesn't include: ${errorMessage}`
  ) {
    try {
      await callback(...params);
    } catch (e) {
      assert.strictEqual(
        e.message.includes(errorMessage),
        true,
        errMsg + `\nActual error message: ${e}`
      );
    }
  },

  newCallObj: (expectation, errMsg) => {
    const callObj = new CallObject(expectation, errMsg);
    return {
      callback: callObj.callback.bind(callObj),
      assert: callObj.assert.bind(callObj),
    };
  },

  willBeCalled: function (errMsg = "Function was not called", callsAmount = 1) {
    return this.newCallObj(errMsg, callsAmount);
  },

  willNotBeCalled: function (errMsg = "Function was called") {
    return this.newCallObj(errMsg, 0);
  },
};

module.exports = assertion;
