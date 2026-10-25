import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';

// Por debajo del statement_timeout (10 s) y del connectionTimeoutMillis del pool: un
// balanceador espera una respuesta rápida, y una base que tarda más que esto cuenta como caída.
export const HEALTH_DB_TIMEOUT_MS = 2000;

export interface HealthStatus {
  status: 'ok' | 'error';
  db: 'up' | 'down';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness and database check',
    description:
      'Public endpoint for load balancers and uptime monitors. Runs SELECT 1 against the database.',
  })
  @ApiOkResponse({ schema: { example: { status: 'ok', db: 'up' } } })
  @ApiServiceUnavailableResponse({
    schema: { example: { status: 'error', db: 'down' } },
  })
  async check(): Promise<HealthStatus> {
    if (await this.databaseIsUp()) {
      return { status: 'ok', db: 'up' };
    }
    throw new ServiceUnavailableException({ status: 'error', db: 'down' });
  }

  private async databaseIsUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), HEALTH_DB_TIMEOUT_MS);
    });
    try {
      return await Promise.race([
        this.dataSource.query('SELECT 1').then(() => true),
        timeout,
      ]);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
