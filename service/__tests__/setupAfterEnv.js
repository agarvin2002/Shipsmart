// This file runs after the test framework is installed in the environment
// Use this for test framework configuration like custom matchers, etc.

// Set test timeout globally (can be overridden per test)
jest.setTimeout(10000);

// Suppress console.log in tests (optional - comment out if you want to see logs)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Example: Add custom matchers (optional)
// expect.extend({
//   toBeValidUUID(received) {
//     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
//     const pass = uuidRegex.test(received);
//     return {
//       message: () => `expected ${received} to be a valid UUID`,
//       pass
//     };
//   }
// });
