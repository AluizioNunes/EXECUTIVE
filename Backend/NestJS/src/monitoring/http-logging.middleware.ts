import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from './monitoring.service';
import { LogType, LogSource } from './monitoring-log.entity';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(private readonly monitoringService: MonitoringService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Registrar a requisição
    const requestLog = {
      logType: LogType.INFO,
      logSource: LogSource.SYSTEM,
      message: `Incoming HTTP request: ${req.method} ${req.url}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        headers: this.sanitizeHeaders(req.headers),
      },
    };

    try {
      await this.monitoringService.log(requestLog);
    } catch (error) {
      console.error('Failed to log HTTP request:', error);
    }

    // Registrar a resposta
    res.on('finish', async () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const responseLog = {
        logType: res.statusCode >= 400 ? LogType.ERROR : LogType.INFO,
        logSource: LogSource.SYSTEM,
        message: `HTTP response: ${req.method} ${req.url} - ${res.statusCode}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          duration: `${duration}ms`,
          responseSize: res.get('Content-Length'),
        },
      };

      try {
        await this.monitoringService.log(responseLog);
      } catch (error) {
        console.error('Failed to log HTTP response:', error);
      }
    });

    next();
  }

  private sanitizeHeaders(headers: any): any {
    // Remover headers sensíveis
    const sanitized = { ...headers };
    delete sanitized['authorization'];
    delete sanitized['cookie'];
    delete sanitized['set-cookie'];
    return sanitized;
  }
}