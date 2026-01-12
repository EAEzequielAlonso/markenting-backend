export interface JwtPayload {
    sub: string;
    email: string;
    churchId?: string; // Active context
    roles?: string[]; // Active roles in that context
}
