require('@testing-library/jest-dom');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Set environment variables for testing
process.env.NODE_ENV = 'test';

// Clean up SQLite test database before each test run
beforeAll(() => {
  const testDbPath = path.resolve(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Clean up SQLite test database after all tests
afterAll(() => {
  const testDbPath = path.resolve(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOMTestUtils.act') ||
       args[0].includes('Warning: React.createElement'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});