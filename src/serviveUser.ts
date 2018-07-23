import { BaseService } from "./serverBase";
import { UserInfo, sign } from "./serverSecurity";
import { addon, ILoginService, UserToken, LoginType } from "red-aop";
import { SessionUtil } from "./serverRemote";

/**
 * 用户名密码登录服务
 */
@addon('UserPasswordLoginService', '用户名密码登录服务', '通过用户名密码登录的服务')
export class UserPasswordLoginService extends BaseService implements ILoginService {
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
     * @param loginType 登陆类型
     * @param loginData 登陆数据（密码、二维码或其他验证信息）
     * @returns token令牌
     */
    login(userName: string, loginType?: LoginType, loginData?: string): Promise<string> {
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
            let token = sign(userToken);
            let session = new SessionUtil(arguments);
            session.setSession('userToken', token);
            return Promise.resolve(token);
        }
        return null;
    }
    /** 登出 */
    logout?(): Promise<boolean> {
        return Promise.resolve(true);
    }
    /** 是否登录 */
    isLogin?(): Promise<boolean> {
        return Promise.resolve(true);
    }
}