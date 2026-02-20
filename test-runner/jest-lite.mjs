import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

class Element {
  constructor(id) {
    this.id = id;
    this.innerHTML = '';
  }
}

class MiniDocument {
  constructor() {
    this._elements = new Map();
    this.body = {
      _html: '',
      set innerHTML(html) {
        this._html = html;
      },
      get innerHTML() {
        return this._html;
      }
    };

    Object.defineProperty(this.body, 'innerHTML', {
      get: () => this.body._html,
      set: (html) => {
        this.body._html = html;
        this._elements.clear();
        const idRegex = /id="([^"]+)"/g;
        let match;
        while ((match = idRegex.exec(html)) !== null) {
          const id = match[1];
          this._elements.set(id, new Element(id));
        }
      }
    });
  }

  getElementById(id) {
    return this._elements.get(id) || null;
  }
}

globalThis.document = new MiniDocument();
globalThis.window = globalThis;

const suites = [];
let currentSuite = null;

function createMockImplementation(impl = () => undefined) {
  const fn = (...args) => {
    fn.mock.calls.push(args);
    return impl(...args);
  };
  fn.mock = { calls: [] };
  return fn;
}

globalThis.jest = {
  fn: (impl) => createMockImplementation(impl)
};

globalThis.describe = (name, callback) => {
  const suite = { name, tests: [], beforeEachFns: [] };
  suites.push(suite);
  const previous = currentSuite;
  currentSuite = suite;
  callback();
  currentSuite = previous;
};

globalThis.beforeEach = (fn) => {
  currentSuite.beforeEachFns.push(fn);
};

globalThis.test = (name, fn) => {
  currentSuite.tests.push({ name, fn });
};

function format(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

globalThis.expect = (received) => ({
  toBe(expected) {
    if (received !== expected) throw new Error(`Expected ${format(received)} to be ${format(expected)}`);
  },
  toEqual(expected) {
    if (!isDeepStrictEqual(received, expected)) {
      throw new Error(`Expected ${format(received)} to equal ${format(expected)}`);
    }
  },
  toContain(expected) {
    if (!received?.includes?.(expected)) {
      throw new Error(`Expected ${format(received)} to contain ${format(expected)}`);
    }
  },
  toBeNull() {
    if (received !== null) throw new Error(`Expected ${format(received)} to be null`);
  },
  toHaveBeenCalledWith(...expectedArgs) {
    const calls = received?.mock?.calls || [];
    const found = calls.some((call) => isDeepStrictEqual(call, expectedArgs));
    if (!found) {
      throw new Error(`Expected mock to be called with ${format(expectedArgs)} but got ${format(calls)}`);
    }
  }
});

const testsDir = path.resolve('__tests__');
const files = fs.readdirSync(testsDir).filter((f) => f.endsWith('.test.js')).sort();
for (const file of files) {
  await import(pathToFileURL(path.join(testsDir, file)));
}

let failures = 0;
for (const suite of suites) {
  console.log(`\n${suite.name}`);
  for (const t of suite.tests) {
    try {
      for (const hook of suite.beforeEachFns) hook();
      await t.fn();
      console.log(`  ✓ ${t.name}`);
    } catch (error) {
      failures += 1;
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${error.message}`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}

console.log('\nAll tests passed.');
