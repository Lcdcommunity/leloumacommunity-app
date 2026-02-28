//backend/src/modules/auth/auth-member.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { AuthMemberService } from './auth-member.service';
import { MemberSignupDto } from './dto/member-signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthMemberController {
  constructor(private readonly service: AuthMemberService) {}

  @Post('member-signup')
  memberSignup(@Body() dto: MemberSignupDto) {
    return this.service.memberSignup(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto);
  }
}