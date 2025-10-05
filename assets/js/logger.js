/**
 * Logger System - Sistema de registro para debug e monitoramento
 * Implementa o princípio Single Responsibility (SOLID)
 */
class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.enabled = true;
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        this.currentLevel = this.logLevels.DEBUG;
    }

    /**
     * Log genérico
     */
    log(level, message, data = null) {
        if (!this.enabled || this.logLevels[level] < this.currentLevel) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data
        };

        this.logs.push(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this._outputToConsole(logEntry);
    }

    /**
     * Log de debug
     */
    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    /**
     * Log de informação
     */
    info(message, data = null) {
        this.log('INFO', message, data);
    }

    /**
     * Log de aviso
     */
    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    /**
     * Log de erro
     */
    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    /**
     * Saída no console do navegador
     */
    _outputToConsole(logEntry) {
        const style = this._getConsoleStyle(logEntry.level);
        const output = `[${logEntry.timestamp}] [${logEntry.level}] ${logEntry.message}`;
        
        switch (logEntry.level) {
            case 'DEBUG':
                console.log(`%c${output}`, style, logEntry.data);
                break;
            case 'INFO':
                console.info(`%c${output}`, style, logEntry.data);
                break;
            case 'WARN':
                console.warn(`%c${output}`, style, logEntry.data);
                break;
            case 'ERROR':
                console.error(`%c${output}`, style, logEntry.data);
                break;
        }
    }

    /**
     * Retorna estilo CSS para o console
     */
    _getConsoleStyle(level) {
        const styles = {
            DEBUG: 'color: #6c757d;',
            INFO: 'color: #0dcaf0; font-weight: bold;',
            WARN: 'color: #ffc107; font-weight: bold;',
            ERROR: 'color: #dc3545; font-weight: bold;'
        };
        return styles[level] || '';
    }

    /**
     * Retorna todos os logs
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Limpa todos os logs
     */
    clearLogs() {
        this.logs = [];
        this.info('Logs limpos');
    }

    /**
     * Exporta logs como JSON
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Define o nível de log
     */
    setLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.currentLevel = this.logLevels[level];
            this.info(`Nível de log alterado para ${level}`);
        }
    }

    /**
     * Habilita/desabilita o logger
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// Instância global do logger
const logger = new Logger();
