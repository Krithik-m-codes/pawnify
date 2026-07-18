import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AuthUserDto } from './dto/auth-user.dto';

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findSessionByToken(token: string): Promise<SessionRecord | null> {
    const rows = await this.supabaseService.query<SessionRecord>(
      `SELECT id, "userId", token, "expiresAt" FROM "session" WHERE token = $1 AND "expiresAt" > NOW() LIMIT 1`,
      [token],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findUserById(userId: string): Promise<AuthUserDto | null> {
    const rows = await this.supabaseService.query<AuthUserDto>(
      `SELECT id, name, email, role, phone, "isActive" FROM "user" WHERE id = $1 LIMIT 1`,
      [userId],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async verifySupabaseJwtUser(token: string): Promise<AuthUserDto | null> {
    const supabase = this.supabaseService.getClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;

    const user = await this.findUserById(data.user.id);
    if (user) return user;

    return {
      id: data.user.id,
      name:
        data.user.user_metadata?.name ||
        data.user.user_metadata?.full_name ||
        data.user.email?.split('@')[0] ||
        'User',
      email: data.user.email || '',
      role: data.user.user_metadata?.role || 'STAFF',
      phone: data.user.phone || null,
      isActive: true,
    };
  }
}
