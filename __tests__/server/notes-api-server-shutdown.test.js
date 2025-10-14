import { jest } from '@jest/globals';
import { NotesServer } from '../../src/notes-api-server.js';

describe('NotesServer gracefulShutdown coverage', () => {
  const originalExit = process.exit;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  let originalSetTimeout;
  let capturedTimeoutFn;

  beforeEach(() => {
    jest.useFakeTimers();
    // Mock console to avoid noisy output and to assert logs
    console.error = jest.fn();
    console.log = jest.fn();
    // Mock process.exit so tests don't terminate
    // @ts-ignore
    process.exit = jest.fn();

    // Capture setTimeout callback to deterministically invoke it
    originalSetTimeout = global.setTimeout;
    capturedTimeoutFn = undefined;
    // @ts-ignore
    global.setTimeout = jest.fn((fn, ms) => {
      capturedTimeoutFn = fn;
      // Return a fake timer id
      return 1;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    // @ts-ignore
    process.exit = originalExit;
    // Restore original setTimeout
    global.setTimeout = originalSetTimeout;
  });

  test('forces shutdown with exit code 1 when server does not close in time', () => {
    const server = new NotesServer();
    // Simulate a server that never calls the close callback
    // @ts-ignore
    server.server = { close: jest.fn() };

    server.gracefulShutdown(100);

    // Deterministically trigger the captured timeout callback
    expect(typeof capturedTimeoutFn).toBe('function');
    capturedTimeoutFn();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Could not close connections in time, forcefully shutting down')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits with code 0 when server closes gracefully', () => {
    const server = new NotesServer();
    // Simulate immediate successful close
    // @ts-ignore
    server.server = { close: (cb) => cb() };

    server.gracefulShutdown(100);

    expect(process.exit).toHaveBeenCalledWith(0);
    expect(process.exit).not.toHaveBeenCalledWith(1);
  });

  test('exits with code 0 when there is no server', () => {
    const server = new NotesServer();
    // Ensure no server present
    // @ts-ignore
    server.server = null;

    server.gracefulShutdown(50);

    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
