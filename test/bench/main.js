"use strict";

const benches = require("./tests/Benches");

const testCases = [...benches];

testCases.forEach((testCase) => {
  const oneRunStart = new Date();
  testCase.run();
  const oneRun = new Date() - oneRunStart;

  const start = new Date();
  for (let i = 0; i < testCase.runAmount; ++i) testCase.run();
  //console.log("result: " + testCase.run());
  const total = new Date() - start;

  console.log(
    `\n${testCase.name}:\nRuns - ${testCase.runAmount}\n` +
      `Time total - ${total}ms\nAverage time per run - ${
        total / testCase.runAmount
      }ms\nInitial one run time: ${oneRun}ms`
  );
});
