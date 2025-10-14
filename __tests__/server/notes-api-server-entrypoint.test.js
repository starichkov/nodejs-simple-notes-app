import { jest } from '@jest/globals';
import { mainEntry, NotesServer } from '../../src/notes-api-server.js';

// Ensure NODE_ENV is test for logger behavior
process.env.NODE_ENV = 'test';

describe('notes-api-server entrypoint (mainEntry) coverage', () => {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalExit = process.exit;

  beforeEach(() => {
    console.error = jest.fn();
    console.log = jest.fn();
    // @ts-ignore
    process.exit = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    // @ts-ignore
    process.exit = originalExit;
    jest.restoreAllMocks();
  });

  test('mainEntry starts server after successful initialization', async () => {
    const initSpy = jest.spyOn(NotesServer.prototype, 'initializeApp').mockResolvedValue({ app: {}, repository: {} });
    const startSpy = jest.spyOn(NotesServer.prototype, 'startServer').mockImplementation(() => ({}));

    await mainEntry();

    expect(initSpy).toHaveBeenCalled();
    expect(startSpy).toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  test('mainEntry logs and exits(1) on initialization failure', async () => {
    const error = new Error('Initialization failed in main');
    jest.spyOn(NotesServer.prototype, 'initializeApp').mockRejectedValue(error);
    const startSpy = jest.spyOn(NotesServer.prototype, 'startServer').mockImplementation(() => ({}));

    await mainEntry();

    expect(startSpy).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Application startup failed:'), error);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
