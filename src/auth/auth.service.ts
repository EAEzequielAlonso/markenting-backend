import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (user && user.password && (await bcrypt.compare(pass, user.password))) {
            // Stripping password from result
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        // Generar Token Interno
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            companyId: user.company?.id
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: user, // Retornamos basic info para el front
        };
    }

    async validateSocialUser(socialUser: { email: string; name?: string; sub?: string; picture?: string }) {
        let user = await this.usersService.findOneByEmail(socialUser.email);

        if (!user) {
            // Usuario nuevo: Registrar automáticamente
            // Generar password aleatorio seguro
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

            user = await this.usersService.create({
                email: socialUser.email,
                fullName: socialUser.name || 'Usuario',
                password: randomPassword,
                companyName: `Empresa de ${socialUser.name || 'Usuario'}`,
                avatarUrl: socialUser.picture,
            });
        } else if (socialUser.picture && user.avatarUrl !== socialUser.picture) {
            // Actualizar avatar si cambió
            user.avatarUrl = socialUser.picture;
            await this.usersService.updateAvatar(user.id, socialUser.picture);
        }

        return this.login(user);
    }
}
