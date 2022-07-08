import jwt, { SignOptions } from 'jsonwebtoken';
import { JWT_PUBLIC, JWT_SECRET } from '../config/default';

export const signJwt = (payload: Object, options: SignOptions = {}) => {
    const privateKey = Buffer.from(
        JWT_SECRET,
        'base64'
    ).toString('ascii');
    console.log(privateKey)
    return jwt.sign(payload, privateKey, {
        ...(options && options),
        algorithm: 'RS256',
    });
};

export const verifyJwt = <T>(token: string): T | null => {
    try {
        const publicKey = Buffer.from(
            JWT_PUBLIC,
            'base64'
        ).toString('ascii');
        return jwt.verify(token, publicKey) as T;
    } catch (error) {
        return null;
    }
};
 