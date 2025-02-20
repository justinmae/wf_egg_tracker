import fs from 'fs';
import path from 'path';

class Logger {
  private logFile: string;
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(this.logsDir, `log_${timestamp}.txt`);
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}\n`;
  }

  private writeToFile(message: string) {
    fs.appendFileSync(this.logFile, message);
  }

  info(message: string, data?: any) {
    const formattedMessage = this.formatMessage('INFO', message, data);
    console.log(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  error(message: string, error?: any) {
    const errorData = error instanceof Error ? 
      { message: error.message, stack: error.stack } : 
      error;
    const formattedMessage = this.formatMessage('ERROR', message, errorData);
    console.error(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  debug(message: string, data?: any) {
    const formattedMessage = this.formatMessage('DEBUG', message, data);
    console.debug(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  getLogsDir(): string {
    return this.logsDir;
  }
}

export const logger = new Logger(); 