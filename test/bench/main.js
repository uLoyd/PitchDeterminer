"use strict";

const benches = require("./tests/Benches");
const clog = require("../utilities/CLog");
const ft = clog.ft;

const testCases = [...benches];

testCases.forEach((testCase) => {
  const oneRunStart = new Date();
  testCase.run();
  const oneRun = new Date() - oneRunStart;

  const start = new Date();
  for (let i = 0; i < testCase.runAmount; ++i) testCase.run();
  const total = new Date() - start;

  clog.print("\n", ft.yellow, testCase.name, ":");
  clog.print(ft.magenta, "Runs - ", testCase.runAmount);
  clog.print(ft.magenta, `Initial one run time: ${oneRun}ms `);
  clog.print(ft.blue, `Time total - ${total}ms`);
  clog.print(ft.blue, `Average time per run - ${total / testCase.runAmount}ms`);
});
