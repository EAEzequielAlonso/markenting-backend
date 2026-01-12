import { Body, Controller, Post, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterChurchDto, JoinChurchDto, LoginDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register-church')
    registerChurch(@Body() dto: RegisterChurchDto) {
        return this.authService.registerChurch(dto);
    }

    @Post('join-church')
    joinChurch(@Body() dto: JoinChurchDto) {
        return this.authService.joinChurch(dto);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getProfile(@Request() req) {
        return req.user;
    }
}
