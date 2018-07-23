import * as express from 'express';
import { setCurrentUserToken } from './serverSecurity';
import { GlobalServices, BaseService } from './serverBase';
import { Buffer } from 'buffer';
import {
    IRemoteRequest,
    log,
    addonDeserialize,
    addonSerialize,
    throwError,
    ErrorStatus
} from 'red-aop';
import { mainApplication } from './serverApp';

/**
 * 请求
 * @param token 令牌
 * @param remoteRequest 远程请求
 * @returns 远程调用方法的结果
 */
export function request(token: string, request: IRemoteRequest): any {
    let service = GlobalServices[request.serviceName];
    if (!service) {
        throwError(
            ErrorStatus.ERROR_SERVICE_NOT_FOUND,
            `远程调用服务${request.serviceName}异常，服务找不到。`);
    }
    let serviceFunc = service[request.functionName];
    if (!serviceFunc) {
        throwError(
            ErrorStatus.ERROR_FUNCTION_NOT_FOUND,
            `远程调用服务${request.serviceName}异常，方法${request.functionName}找不到。`);
    }
    // apply 调用的 caller 为当前的 service 对象
    return (<BaseService>service).call(token, request.functionName, request.args);
}

/**
 * 远程调用服务响应
 * @param req 请求
 * @param res 响应
 */
export function remoteCallServiceHandler(req: express.Request, res: express.Response) {
    // 定义数组变量,接收请求的二进制数据
    // REMARK:用二进制接收数据避免中文乱码
    let buffer: any = [];

    // 通过req的data事件监听函数，每当接受到请求体的数据，就累加到post变量中
    req.on('data', function (chunk: string | Buffer) {
        log('remote', `数据到达,url=${req.url}`);
        buffer.push(chunk);
    });

    let errorFunc = (error: Error) => {
        // 此处是在主线程运行，要确保不崩溃
        try {
            res.status(error.status || ErrorStatus.ERROR_SERVICE).send(`${error.message}`);
            log('remote', `异常发送,url=${req.url}`);
        } catch (error) {
            log('remote', new Error(`数据响应时发生未知异常: ${error}`));
        }
    };

    let responseFunc = (requestID: string, values: any) => {
        // 此处是在主线程运行，要确保不崩溃
        try {
            let response = addonSerialize({
                d: values
            });
            res.send(response);
            log('remote', `响应发送,url=${req.url},id=${requestID}`);
        } catch (error) {
            log('remote', new Error(`数据响应时发生未知异常: ${error}`));
        }
    };

    // 在end事件触发后，通过querystring.parse将post解析为真正的POST请求格式，然后向客户端返回。
    req.on('end', function () {
        try {
            // REMARK:将请求的二进制数据进行utf8编码处理
            let data = Buffer.concat(buffer);
            let post = data.toString('utf8');
            let requestObj: IRemoteRequest = addonDeserialize(post);
            if (requestObj.userToken) {
                // 设置当前用户
                setCurrentUserToken(requestObj.userToken);
            }
            log('remote', `请求接收,url=${req.url},id=${requestObj.id},serviceName=${requestObj.serviceName},functionName=${requestObj.functionName}`);
            let token = req.session ? req.session.token : undefined;
            let result = request(token, requestObj);
            if (result &&
                result.constructor &&
                result.constructor.prototype.then) {
                // 处理Promise
                result.then((values: any) => {
                    // 此处是异步返回，必须try-catch，否则有崩溃风险
                    try {
                        // 此处恢复当前用户
                        setCurrentUserToken(requestObj.userToken);
                        responseFunc(requestObj.id, values);
                    } catch (error) {
                        errorFunc(error);
                    }
                }).catch((error: Error) => {
                    // 此处恢复当前用户
                    setCurrentUserToken(requestObj.userToken);
                    errorFunc(error);
                });
            } else {
                // 处理非Promise
                responseFunc(requestObj.id, result);
            }
        } catch (error) {
            errorFunc(error);
        }
    });
}

/**
 * Session工具类
 */
export class SessionUtil {
    /** Session 工具类 */
    constructor(public args: IArguments) {

    }
    /** 请求 */
    public get req(): express.Request {
        return <express.Request>(this.args[this.args.length - 1]);
    }
    /**
     * 设置Session
     * @param key 关键字
     * @param value 值
     */
    setSession?(key: string, value: any) {
        // 没有配置Session
        if (!mainApplication.sessionConfig) { return; }
        this.req.session[key] = value;
        this.req.session.save(error => {
            if (error) {
                console.log('设置Session [${key}] 异常:' + error.stack);
                throw new Error(`设置Session [${key}] 异常`);
            }
        });
    }
    /**
     * 获取Session
     * @param key 关键字
     */
    getSession?(key: string) {
        // 没有配置Session
        if (!mainApplication.sessionConfig) { return undefined; }
        return this.req.session[key];
    }
    /**
     * 销毁Session
     * @param key 关键字
     */
    destroySession?(key: string) {
        // 没有配置Session
        if (!mainApplication.sessionConfig) { return; }
        this.req.session[key] = undefined;
        this.req.session.save(error => {
            if (error) {
                console.log('设置Session [${key}] 异常:' + error.stack);
                throw new Error(`设置Session [${key}] 异常`);
            }
        });
    }
}