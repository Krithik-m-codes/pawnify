import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

@Injectable()
export class SupabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseClient: SupabaseClient;
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const supabaseUrl = this.configService.get<string>('supabase.url') || '';
    const serviceRoleKey =
      this.configService.get<string>('supabase.serviceRoleKey') ||
      this.configService.get<string>('supabase.anonKey') ||
      '';

    if (supabaseUrl && serviceRoleKey) {
      this.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
        },
      });
      this.logger.log('Supabase client initialized');
    } else {
      this.logger.warn('Supabase credentials missing. SupabaseClient not initialized.');
    }

    const databaseUrl = this.configService.get<string>('database.url');
    if (databaseUrl) {
      this.pool = new Pool({
        connectionString: databaseUrl,
      });
      this.logger.log('PostgreSQL database pool initialized');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }
}
