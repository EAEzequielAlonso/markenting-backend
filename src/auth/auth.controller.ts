import { Controller, Post, Body, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { SocialLoginDto } from './dto/social-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService, // Inyectamos users para create
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Registrar un nuevo usuario y comercio' })
    @UsePipes(new ValidationPipe())
    async register(@Body() createUserDto: CreateUserDto) {
        const user = await this.usersService.create(createUserDto);
        // Auto-login después de registrar
        return this.authService.login(user);
    }

    @Post('login')
    async login(@Body() loginDto: any) { // TODO: Create LoginDto
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }
    @Post('social-login')
    async socialLogin(@Body() socialLoginDto: SocialLoginDto) {
        return this.authService.validateSocialUser(socialLoginDto);
    }
}
