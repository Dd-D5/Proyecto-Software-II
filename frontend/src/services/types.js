export const EventType = {
  IO: 'io',
  COMMAND: 'command',
  ALERT: 'alert',
  CONNECTION: 'connection'
};

export const ServiceType = {
  SSH: 'ssh',
  FTP: 'ftp',
  HTTP: 'http'
};

/**
 * @typedef {Object} TelemetryMessage
 * @property {string} type - EventType ('io' | 'command' | 'alert' | 'connection')
 * @property {string} service - ServiceType ('ssh' | 'ftp' | 'http')
 * @property {string} [payload] - Keystroke or data chunk
 * @property {string} [command] - Full executed command
 * @property {string} [ip] - Attacker IP address
 * @property {string} [mac] - Attacker MAC address
 * @property {string} [session_id] - Identifier shared by events from one session
 * @property {string} [timestamp] - ISO timestamp or local time string
 * @property {Object} [metadata] - Additional honeynet metrics
 */
