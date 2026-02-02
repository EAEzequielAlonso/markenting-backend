
import { SetMetadata } from '@nestjs/common';
import { AppPermission } from '../authorization/permissions.enum';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: AppPermission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
