"use strict";

function convertLargeContainer(Type, data, dataLength) {
  const ab = new ArrayBuffer(dataLength);
  let view = new Type(ab);

  for (let i = 0; i < dataLength; ++i) view[i] = data[i];

  return ab;
}

function convertToArrayBuffer(Type, data, maxSmallContainerSize) {
  const dataLength = data.length;

  if (dataLength <= maxSmallContainerSize) {
    return new Type(data).buffer;
  }

  return convertLargeContainer(Type, data, dataLength);
}

module.exports = convertToArrayBuffer;
