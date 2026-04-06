import { Body, Controller, HttpCode, HttpStatus, Patch, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { UsersService } from './users.service';
import { UpdateRoleSchema } from './dto/update-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PATCH /api/users/me/role
   * Screen 2 — 역할 선택 확인
   *
   * 선택된 role을 서버에서 검증하고 acknowledge 한다.
   * User 모델에 role 필드가 없으므로 실제 DB 저장은
   * 팀 생성/참가 시 TeamMembership에 이루어진다.
   */
  @Patch('me/role')
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ROLE',
        message: '유효하지 않은 역할입니다',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    return this.usersService.acknowledgeRole(user.sub, parsed.data.role);
  }
}
