import * as jwt from 'jsonwebtoken';
import { UserToken, setCurrentPrincipal, UserIdentity, Principal } from 'red-aop';

/**
 * 用于生成令牌的私钥
 */
export let securityOrPrivateKey: string = 'shhhhh';
/**
 * 验证令牌的公钥
 */
export let securityOrPublicKey: string = 'shhhhh';

/**
 * 验证当前用户令牌
 * @param user 用户
 */
export function verify(tokenString: string): UserToken {
    let userToken: UserToken = jwt.verify(tokenString, securityOrPublicKey) as UserToken;
    return userToken;
}

/**
 * 签名并生成令牌
 */
export function sign(userToken: UserToken): string {
    return jwt.sign(userToken, securityOrPrivateKey);
}

/**
 * 设置当前用户令牌
 * @param tokenString 用户令牌
 */
export function setCurrentUserToken(tokenString: string) {
    if (!tokenString) {
        setCurrentPrincipal(null);
        return;
    }
    let userToken = verify(tokenString);
    if (!userToken) {
        throw new Error('用户验证失败');
    }

    let user = new UserIdentity(userToken, tokenString);
    setCurrentPrincipal(new Principal(user));
}

/**
 * 用户信息
 */
export class UserInfo {
    userName: string;
    userID: string;
    password: string;
    roles: string[];
}
