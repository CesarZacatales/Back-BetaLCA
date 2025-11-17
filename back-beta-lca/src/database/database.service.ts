import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const user = (this.configService.get('DB_USER') as string) ?? '';
    const password = (this.configService.get('DB_PASSWORD') as string) ?? '';
    const host = (this.configService.get('DB_HOST') as string) ?? '';
    const database = (this.configService.get('DB_NAME') as string) ?? '';
    const port = parseInt((this.configService.get('DB_PORT') as string) ?? '5432', 10);

    const poolConfig: PoolConfig = {
      user,
      password,
      host,
      database,
      port,
      max: 20,
      idleTimeoutMillis: 30000,
    };

    try {
      this.pool = new Pool(poolConfig);
      await this.pool.query('SELECT 1');
      Logger.log('Conectado a PostgreSQL', 'DatabaseService');
    } catch (err: unknown) {
      if (err instanceof Error) {
        Logger.error(err.message, err.stack, 'DatabaseService');
      } else {
        Logger.error('Error desconocido al conectar a PostgreSQL', '', 'DatabaseService');
      }
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      Logger.log('Conexión cerrada con PostgreSQL', 'DatabaseService');
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('La conexión a la base de datos aún no se ha inicializado.');
    }
    return this.pool;
  }
}
