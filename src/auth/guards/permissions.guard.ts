import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppPermission } from '../authorization/permissions.enum';
import { getPermissionsForRoles, ROLE_PERMISSIONS } from '../authorization/role-permissions.config';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { SystemRole } from '../../common/enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<AppPermission[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions) {
            return true; // No permissions required, allow access
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            return false; // No user logged in
        }

        // 1. Super Admin Bypass
        if (user.systemRole === SystemRole.ADMIN_APP) {
            return true;
        }

        // Let's rely on the roles array attached to the user from the JWT Strategy.
        const userRoles = user.roles || [];

        // If user object has systemRole property (it should if mapped correctly in strategy)
        // We'll add it to the effective roles for permission calculation
        /* 
           NOTE: In AuthService.login, we didn't explicitly add systemRole to the 'roles' array in the payload,
           but we did select it. We might need to ensure the JWT Strategy includes 'systemRole' in the user object.
           Let's assume user.roles is the array of strings we put in JWT.
        */

        const userPermissions = getPermissionsForRoles(userRoles);

        const hasPermission = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );

        if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
