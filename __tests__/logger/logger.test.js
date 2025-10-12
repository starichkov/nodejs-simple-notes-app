import { jest } from '@jest/globals';
import { logger as globalLogger, createLogger } from '../../src/logger.js';

// Save originals
const origEnv = { ...process.env };
const origConsole = { ...console };

function resetEnv() {
  process.env = { ...origEnv };
}

function stubConsole() {
  console.log = jest.fn();
  console.debug = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

function restoreConsole() {
  console.log = origConsole.log;
  console.debug = origConsole.debug;
  console.warn = origConsole.warn;
  console.error = origConsole.error;
}

describe('logger.js', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-02T03:04:05.678Z'));
    resetEnv();
    stubConsole();
  });

  afterEach(() => {
    jest.useRealTimers();
    restoreConsole();
    resetEnv();
    jest.clearAllMocks();
  });

  describe('test environment passthrough', () => {
    test('preserves original console signature in NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.LOG_LEVEL; // default level is info

      const log = createLogger('TestComp');
      log.info('hello', { a: 1 }, 42);
      log.warn('warned', { b: 2 });

      // info maps to console.log and should pass arguments unformatted
      expect(console.log).toHaveBeenCalledWith('hello', { a: 1 }, 42);
      // warn maps to console.warn and should pass arguments unformatted
      expect(console.warn).toHaveBeenCalledWith('warned', { b: 2 });

      // debug should NOT log at default level (info)
      log.debug('dbg');
      expect(console.debug).not.toHaveBeenCalledWith('dbg');

      // but when level allows it, it should log
      const verboseLog = createLogger('Verbose');
      verboseLog.setLevel('trace');
      verboseLog.trace('trace-ok');
      expect(console.debug).toHaveBeenCalledWith('trace-ok');
    });

    test('setLevel changes gating and invalid level is ignored', () => {
      process.env.NODE_ENV = 'test';
      const log = createLogger('Lvl');

      // info logs by default
      log.info('i1');
      expect(console.log).toHaveBeenCalledWith('i1');

      // set to warn: info should be suppressed
      log.setLevel('warn');
      log.info('i2');
      expect(console.log).not.toHaveBeenCalledWith('i2');

      // invalid level should keep current (warn)
      log.setLevel('invalid-level');
      log.debug('d1');
      expect(console.debug).not.toHaveBeenCalledWith('d1');

      // warn and above should log
      log.warn('w1');
      log.error('e1');
      log.fatal('f1');
      expect(console.warn).toHaveBeenCalledWith('w1');
      expect(console.error).toHaveBeenCalledWith('e1');
      expect(console.error).toHaveBeenCalledWith('f1');
    });
  });

  describe('non-test environment formatting', () => {
    test('formats message with timestamp, level, and component for strings', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'trace';
      const log = createLogger('Comp');

      log.info('hello');

      expect(console.log).toHaveBeenCalledTimes(1);
      const [formatted] = console.log.mock.calls[0];
      expect(formatted).toMatch(/^2024-01-02T03:04:05\.678Z INFO \[Comp\] - hello$/);
    });

    test('formats objects via JSON.stringify and preserves extra args', () => {
      process.env.NODE_ENV = 'development';
      const log = createLogger('X');
      log.setLevel('trace');

      log.debug({ a: 1 }, 99);

      expect(console.debug).toHaveBeenCalledTimes(1);
      const [firstArg, secondArg] = console.debug.mock.calls[0];
      expect(firstArg).toBe('2024-01-02T03:04:05.678Z DEBUG [X] - {"a":1}');
      expect(secondArg).toBe(99);
    });

    test('special-cases Error: prints message, newline, stack, then rest', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'trace';
      const log = createLogger('ErrComp');

      const err = new Error('boom');
      log.error(err, 'extra');

      expect(console.error).toHaveBeenCalledTimes(1);
      const call = console.error.mock.calls[0];
      // 4 args: formatted message, '\n', stack, 'extra'
      expect(call.length).toBe(4);
      expect(call[0]).toBe('2024-01-02T03:04:05.678Z ERROR [ErrComp] - boom');
      expect(call[1]).toBe('\n');
      expect(String(call[2])).toContain('Error: boom');
      expect(call[3]).toBe('extra');
    });

    test('child logger concatenates component names and inherits level', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'warn';

      const base = createLogger('Base');
      base.setLevel('warn');
      const child = base.child('Child');

      // At warn level, info should be suppressed
      child.info('nope');
      expect(console.log).not.toHaveBeenCalled();

      // But warn should pass and include concatenated component
      child.warn('careful');
      expect(console.warn).toHaveBeenCalledTimes(1);
      const [msg] = console.warn.mock.calls[0];
      expect(msg).toMatch(/^2024-01-02T03:04:05\.678Z WARN \[Base:Child\] - careful$/);

      // Changing base level should not retroactively change already-created child
      base.setLevel('error');
      child.warn('still-warn');
      // existing child remains at warn level, so this should log as well
      expect(console.warn).toHaveBeenCalledTimes(2);

      // New child after level change should inherit new level
      const child2 = base.child('Child2');
      child2.warn('blocked');
      // warn should be blocked for new child (level is error)
      expect(console.warn).toHaveBeenCalledTimes(2);
      child2.error('allowed');
      expect(console.error).toHaveBeenCalled();
    });

    test('method mappings: info->log, trace/debug->debug, warn->warn, error/fatal->error', () => {
      process.env.NODE_ENV = 'development';
      const log = createLogger('Map');
      log.setLevel('trace');

      log.info('i');
      expect(console.log).toHaveBeenCalled();

      log.trace('t');
      log.debug('d');
      expect(console.debug).toHaveBeenCalledTimes(2);

      log.warn('w');
      expect(console.warn).toHaveBeenCalled();

      log.error('e');
      log.fatal('f');
      expect(console.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('exported singleton logger', () => {
    test('global logger supports basic methods', () => {
      process.env.NODE_ENV = 'test';
      stubConsole();

      // Cannot inspect class type (not exported), but methods should exist and work
      globalLogger.info('G');
      expect(console.log).toHaveBeenCalledWith('G');
    });
  });

  // Additional tests to cover branch edges: constructor fallback, root logger behavior, and console.debug absence
  describe('edge branches coverage for logger', () => {
    test('constructor falls back to default level when provided level is invalid via createLogger', () => {
      process.env.NODE_ENV = 'test';
      // Force singleton to hold an invalid level and create a logger, triggering default fallback in constructor
      globalLogger.level = 'not-a-level';
      const log = createLogger('InvalidLevelCtor');
      expect(log.level).toBe('info');
      console.log = jest.fn();
      log.info('ok');
      expect(console.log).toHaveBeenCalledWith('ok');
    });

    test('format omits component section when logger has no component', () => {
      process.env.NODE_ENV = 'development';
      jest.setSystemTime(new Date('2024-01-02T03:04:05.678Z'));
      // Ensure logging allowed
      globalLogger.setLevel('trace');
      console.log = jest.fn();
      globalLogger.info('no-comp');
      const [msg] = console.log.mock.calls[0];
      expect(msg).toBe('2024-01-02T03:04:05.678Z INFO - no-comp');
    });

    test('trace/debug fall back to console.log when console.debug is absent', () => {
      process.env.NODE_ENV = 'test';
      // Temporarily replace global console with a minimal fake that lacks 'debug'
      const realConsole = global.console;
      const fakeConsole = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.console = fakeConsole;

      try {
        const log = createLogger('NoDebug');
        log.setLevel('trace');
        log.trace('t');
        log.debug('d');

        expect(fakeConsole.log).toHaveBeenCalledWith('t');
        expect(fakeConsole.log).toHaveBeenCalledWith('d');
      } finally {
        // Restore the real console to avoid cross-suite side effects
        global.console = realConsole;
      }
    });

    test('child from root logger composes component name only (no base prefix)', () => {
      process.env.NODE_ENV = 'development';
      jest.setSystemTime(new Date('2024-01-02T03:04:05.678Z'));
      const child = globalLogger.child('OnlyChild');
      globalLogger.setLevel('trace');
      console.warn = jest.fn();
      child.warn('w');
      const [msg] = console.warn.mock.calls[0];
      expect(msg).toBe('2024-01-02T03:04:05.678Z WARN [OnlyChild] - w');
    });
  });
});
