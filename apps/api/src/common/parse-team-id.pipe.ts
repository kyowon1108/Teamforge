import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// UUID v4 또는 CUID2 허용
const TEAM_ID_RE = /^[a-z0-9-]{20,36}$/;

@Injectable()
export class ParseTeamIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || !TEAM_ID_RE.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_TEAM_ID',
        message: '유효하지 않은 팀 ID 형식입니다',
      });
    }
    return value;
  }
}
