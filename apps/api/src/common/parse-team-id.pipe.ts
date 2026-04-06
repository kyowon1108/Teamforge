import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// CUID2: 소문자 + 숫자, 20~30자
const TEAM_ID_RE = /^[a-z0-9]{20,30}$/;

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
