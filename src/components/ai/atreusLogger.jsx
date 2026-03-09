/**
 * Atreus Logger
 * Tracks all Atreus interactions for debugging and analytics
 */

class AtreusLogger {
  constructor() {
    this.logs = [];
    this.enabled = true; // Set to false in production if needed
  }

  log(type, message, data = {}) {
    if (!this.enabled) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.logs.push(logEntry);
    
    // Console output with colors
    const colors = {
      info: 'color: #3b82f6',
      success: 'color: #10b981',
      warning: 'color: #f59e0b',
      error: 'color: #ef4444',
      context: 'color: #8b5cf6'
    };
    
    console.log(
      `%c[Atreus ${type.toUpperCase()}]`,
      colors[type] || 'color: #6b7280',
      message,
      data
    );
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  info(message, data) {
    this.log('info', message, data);
  }

  success(message, data) {
    this.log('success', message, data);
  }

  warning(message, data) {
    this.log('warning', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  context(message, data) {
    this.log('context', message, data);
  }

  getLogs() {
    return this.logs;
  }

  exportLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atreus-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clear() {
    this.logs = [];
    console.log('%c[Atreus] Logs cleared', 'color: #6b7280');
  }
}

export const atreusLogger = new AtreusLogger();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.atreusLogger = atreusLogger;
}