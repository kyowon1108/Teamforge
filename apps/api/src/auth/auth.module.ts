import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JtiCacheService } from './jti-cache.service';
import { SyncSecretGuard } from './sync-secret.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.SESSION_EXCHANGE_SECRET;
        if (!secret) {
          throw new Error('SESSION_EXCHANGE_SECRET environment variable is not set');
        }
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, JwtAuthGuard, AuthService, JtiCacheService, SyncSecretGuard],
  exports: [JwtAuthGuard, JtiCacheService],
})
export class AuthModule {}
