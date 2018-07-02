import * as jwt from 'jsonwebtoken';
import {
    UserToken,
    UserIdentity,
    Principal,
    setCurrentPrincipal,
    addon,
    BaseAddon,
    ILoginService
} from 'red-aop';

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
 * @author pao
 * @param user 用户
 */
export function verify(tokenString: string): UserToken {
    let userToken: UserToken = jwt.verify(tokenString, securityOrPublicKey) as UserToken;
    return userToken;
}

/**
 * 签名并生成令牌
 * @author pao
 */
export function sign(userToken: UserToken): string {
    return jwt.sign(userToken, securityOrPrivateKey);
}

/**
 * 设置当前用户令牌
 * @author pao
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
 * @author pao
 */
export class UserInfo {
    userName: string;
    userID: string;
    password: string;
    roles: string[];
}

/**
 * 用户名密码登录服务
 * @author pao
 */
@addon('UserPasswordLoginService', '用户名密码登录服务', '通过用户名密码登录的服务')
export class UserPasswordLoginService extends BaseAddon implements ILoginService {
    /**
     * 构造函数
     * @param userPassList 用户密码列表
     * @param expireSeconds 超时时间
     */
    constructor(public userPassList?: UserInfo[], public expireSeconds: number = 60 * 60) {
        super();
    }

    /**
     * 登录
     * @param userName 用户名
     * @param loginData 登陆数据（密码、二维码或其他验证信息）
     * @returns token
     */
    login(userName: string, loginData: string): string {
        if (!this.userPassList) { return null; }
        let userInfo = this.userPassList.find((value, index) => {
            if (value.userName === userName && value.password === loginData) {
                return true;
            }
            return false;
        });
        if (!userInfo) {
            let expireTime = new Date();
            // 计算超时时间
            expireTime.setTime(expireTime.getTime() + this.expireSeconds * 1000);
            let userToken = new UserToken(userInfo.userID, expireTime, userInfo.roles);
            return sign(userToken);
        }
        return null;
    }
}