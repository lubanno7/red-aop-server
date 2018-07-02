import * as express from 'express';
import { setCurrentUserToken } from './serverSecurity';
import { GlobalServices, BaseService } from './serverBase';
import { Buffer } from 'buffer';
import {
    IRemoteRequest,
    throwError,
    ErrorStatus,
    log,
    addonDeserialize,
    addonSerialize
} from 'red-aop';

/**
 * 请求
 * @author pao
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
 * @author pao
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
                    let response = addonSerialize({
                        d: values
                    });
                    res.send(response);
                }).catch((error: Error) => {
                    res.status(error.status || ErrorStatus.ERROR_SERVICE).send(`${error.message}`);
                    log('remote', `异常发送,url=${req.url}`);
                });
            } else {
                // 处理非Promise
                let response = addonSerialize({
                    d: result
                });
                res.send(response);
            }
            log('remote', `响应发送,url=${req.url},id=${requestObj.id}`);
        } catch (error) {
            res.status(error.status || ErrorStatus.ERROR_SERVICE).send(`${error.message}`);
            log('remote', `异常发送,url=${req.url}`);
        }
    });
}