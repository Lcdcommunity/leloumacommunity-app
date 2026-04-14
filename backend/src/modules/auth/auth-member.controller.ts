// backend/src/modules/auth/auth-member.controller.ts
import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthMemberService } from './auth-member.service';
import { MemberSignupDto } from './dto/member-signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthMemberController {
  constructor(private readonly service: AuthMemberService) {}

  @Post('member-signup')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  memberSignup(
    @Body() dto: MemberSignupDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.service.memberSignup(dto, file);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto);
  }
}