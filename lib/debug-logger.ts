/**
 * Sistema de debug e logging estruturado
 * Rastreia todas as operações da aplicação com requestId único
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  requestId: string;
  location: string;
  message: string;
  data?: any;
  step?: string;
  input?: any;
  output?: any;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Gera um requestId único para rastrear requisições
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitiza dados para remover informações sensíveis
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'authorization', 'clientSecret'];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Cria uma entrada de log estruturada
 */
function createLogEntry(
  level: LogLevel,
  location: string,
  message: string,
  requestId: string,
  options: {
    data?: any;
    step?: string;
    input?: any;
    output?: any;
    duration?: number;
    error?: Error | any;
  } = {}
): LogEntry {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    requestId,
    location,
    message,
  };

  if (options.data !== undefined) {
    entry.data = sanitizeData(options.data);
  }
  if (options.step) {
    entry.step = options.step;
  }
  if (options.input !== undefined) {
    entry.input = sanitizeData(options.input);
  }
  if (options.output !== undefined) {
    entry.output = sanitizeData(options.output);
  }
  if (options.duration !== undefined) {
    entry.duration = options.duration;
  }
  if (options.error) {
    entry.error = {
      message: options.error.message || String(options.error),
      stack: options.error.stack,
      name: options.error.name,
    };
  }

  return entry;
}

/**
 * Log de requisição de API
 */
export function logApiRequest(
  endpoint: string,
  params: any,
  requestId: string
): void {
  const entry = createLogEntry('info', endpoint, 'API Request', requestId, {
    data: { params },
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[${entry.level.toUpperCase()}] ${entry.timestamp} [${requestId}] ${endpoint}:`, entry);
  }
}

/**
 * Log de resposta de API
 */
export function logApiResponse(
  endpoint: string,
  response: any,
  requestId: string,
  duration: number
): void {
  const entry = createLogEntry('info', endpoint, 'API Response', requestId, {
    data: { response },
    duration,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[${entry.level.toUpperCase()}] ${entry.timestamp} [${requestId}] ${endpoint} (${duration}ms):`, entry);
  }
}

/**
 * Log de processamento de dados
 */
export function logDataProcessing(
  step: string,
  input: any,
  output: any,
  requestId: string
): void {
  const entry = createLogEntry('debug', step, 'Data Processing', requestId, {
    step,
    input,
    output,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[${entry.level.toUpperCase()}] ${entry.timestamp} [${requestId}] ${step}:`, entry);
  }
}

/**
 * Log de erro
 */
export function logError(
  location: string,
  error: Error | any,
  context: any,
  requestId: string
): void {
  const entry = createLogEntry('error', location, 'Error', requestId, {
    data: { context },
    error,
  });

  // Erros sempre são logados, mesmo em produção
  console.error(`[${entry.level.toUpperCase()}] ${entry.timestamp} [${requestId}] ${location}:`, entry);
}

/**
 * Log genérico
 */
export function log(
  level: LogLevel,
  location: string,
  message: string,
  requestId: string,
  data?: any
): void {
  const entry = createLogEntry(level, location, message, requestId, { data });

  if (process.env.NODE_ENV === 'development' || level === 'error' || level === 'warn') {
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logMethod(`[${entry.level.toUpperCase()}] ${entry.timestamp} [${requestId}] ${location}:`, entry);
  }
}
