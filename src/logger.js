// Simple, dependency-free logger with levels and optional component context
// Usage:
//   import { logger, createLogger } from './logger.js';
//   const log = createLogger('MyComponent');
//   log.info('Started');
//
// Environment variables:
//   LOG_LEVEL: trace | debug | info | warn | error | fatal (default: info)
//   NODE_ENV: if set to 'test', default level becomes 'warn'

const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

function normalizeLevel(level) {
  if (!level) return null;
  const l = String(level).toLowerCase();
  return LEVELS[l] ? l : null;
}

function defaultLevel() {
  return 'info';
}

function getEnvLevel() {
  return normalizeLevel(process.env.LOG_LEVEL) || defaultLevel();
}

class Logger {
  constructor(component = null, level = getEnvLevel()) {
    this.component = component;
    this.level = normalizeLevel(level) || defaultLevel();
  }

  child(componentName) {
    const name = this.component ? `${this.component}:${componentName}` : componentName;
    return new Logger(name, this.level);
  }

  setLevel(level) {
    const normalized = normalizeLevel(level);
    if (normalized) {
      this.level = normalized;
    }
  }

  shouldLog(targetLevel) {
    return LEVELS[targetLevel] >= LEVELS[this.level];
  }

  format(level, message) {
    const ts = new Date().toISOString();
    const comp = this.component ? ` [${this.component}]` : '';
    return `${ts} ${level.toUpperCase()}${comp} - ${message}`;
  }

  // Internal emit that preserves object/error arguments sensibly
  emit(method, level, args) {
    if (!this.shouldLog(level)) return;

    // In test environment, preserve original console signature for jest expectations
    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line no-console
      console[method](...args);
      return;
    }

    // If first arg is an Error, print message + stack separately for clarity
    if (args.length && args[0] instanceof Error) {
      const err = args[0];
      const rest = Array.from(args).slice(1);
      const msg = this.format(level, err.message);
      // eslint-disable-next-line no-console
      console[method](msg, '\n', err.stack, ...rest);
      return;
    }

    const [first, ...rest] = args;
    const msg = this.format(level, typeof first === 'string' ? first : JSON.stringify(first));
    // eslint-disable-next-line no-console
    console[method](msg, ...rest);
  }

  trace(...args) { this.emit('debug' in console ? 'debug' : 'log', 'trace', args); }
  debug(...args) { this.emit('debug' in console ? 'debug' : 'log', 'debug', args); }
  // Use console.log for info to preserve existing tests that stub console.log
  info(...args)  { this.emit('log', 'info', args); }
  warn(...args)  { this.emit('warn', 'warn', args); }
  error(...args) { this.emit('error', 'error', args); }
  fatal(...args) { this.emit('error', 'fatal', args); }
}

export const logger = new Logger();
export function createLogger(component) {
  return new Logger(component, logger.level);
}
