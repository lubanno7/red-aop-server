import * as fs from 'fs';
import {
    addon,
    BaseAddon,
    addonSerialize,
    log,
    addonDeserialize,
    throwError,
    ErrorStatus
} from 'red-aop';
import { setCurrentUserToken } from './serverSecurity';

/**
 * 默认文件编码器
 */
const defaultFileEncoding = 'utf-8';

/**
 * 移除文件中的BOM
 * @param bin
 */
export function removeBOM(bin: Buffer) {
    if (bin[0] === 0xEF && bin[1] === 0xBB && bin[2] === 0xBF) {
        bin = bin.slice(3);
    }
    return bin;
}

/**
 * 保存
 * @param filePath 文件路径
 */
export function saveObject(filePath: string, obj: Object): void {
    let configString = addonSerialize(obj);
    fs.writeFileSync(filePath, configString, defaultFileEncoding);

    log('file', `配置文件:${filePath}保存完毕`);
}

/**
 * 读取
 * @param filePath 文件路径
 */
export function loadObject(filePath: string): Object {
    let bin = fs.readFileSync(filePath);
    // 移除BOM
    bin = removeBOM(bin);
    let buffer = bin.toString(defaultFileEncoding);
    let obj = addonDeserialize(buffer);

    log('file', `配置文件:${filePath}读取完毕`);

    return obj;
}

/**
 * 准备配置
 * @param defaultConfig 默认配置对象
 * @param configFile 配置文件
 * @param loadConfig 是否从配置文件加载
 * @param saveConfig 是否保存配置文件
 */
export function prepareConfig(
    defaultConfig: Object,
    configFile: string,
    loadConfig: boolean = false,
    saveConfig: boolean = true): Object {
    let configObject: Object;
    // 加载应用程序配置
    if (loadConfig) {
        configObject = loadObject(configFile);
    } else {
        configObject = defaultConfig;
        if (saveConfig) {
            saveObject(configFile, configObject);
        }
    }
    return configObject;
}

/**
 * 全局服务器列表
 */
export class GlobalServers {

}

/**
 * 服务信息: 包含服务名称和服务对象的信息
 */
@addon('ServerInfo', '服务信息', '包含服务名称和服务对象的信息')
export class ServerInfo {
    constructor(
        public serverName?: string,
        public serverObject?: BaseServer) {

    }
}
/**
 * 注册服务列表
 * @param serverInfos 服务信息列表
 */
export function registerServers(serverInfos: ServerInfo[]) {
    for (var serverInfo of serverInfos) {
        registerServer(serverInfo);
    }
}
/**
 * 注册服务
 * @param serverInfo 服务信息
 */
export function registerServer(serverInfo: ServerInfo) {
    if (!GlobalServers[serverInfo.serverName]) {
        log('server', `服务注册，服务名称：${serverInfo.serverName}`);
        GlobalServers[serverInfo.serverName] = serverInfo.serverObject;
    }
}

/** 根据名称获取服务
 * @param name 名称
 */
export function getServerByName(name: string) {
    return GlobalServers[name];
}

/**
 * 全局服务列表
 */
export class GlobalServices {

}

/**
 * 服务信息: 包含服务名称和服务对象的信息
 */
@addon('ServiceInfo', '服务信息', '包含服务名称和服务对象的信息')
export class ServiceInfo {
    constructor(
        public serviceName?: string,
        public serviceObject?: BaseService) {

    }
}
/**
 * 注册服务列表
 * @param serviceInfos 服务信息列表
 */
export function registerServices(serviceInfos: ServiceInfo[]) {
    for (var serviceInfo of serviceInfos) {
        registerService(serviceInfo);
    }
}
/**
 * 注册服务
 * @param serviceInfo 服务信息
 */
export function registerService(serviceInfo: ServiceInfo) {
    if (!GlobalServices[serviceInfo.serviceName]) {
        log('service', `服务注册，服务名称：${serviceInfo.serviceName}`);
        GlobalServices[serviceInfo.serviceName] = serviceInfo.serviceObject;
    }
}

/** 根据名称获取服务
 * @param name 名称
 */
export function getServiceByName(name: string) {
    return GlobalServices[name];
}

/** 
 * 令牌权限
 */
export type TokenAuth = { token: string, auth: boolean };

/**
 * 名称:基础服务
 * @description 所有服务的基类
 * @author huyl
 */
@addon('BaseService', '基础服务', '所有服务的基类')
export class BaseService extends BaseAddon {
    // 角色列表
    roles?: Array<any>;

    /** 基础服务 */
    constructor() {
        super();
    }
    /**
     * 验证令牌权限
     * @protected
     * @param {string} token 令牌
     * @param {string} functionName 函数名称
     * @param {any[]} args 函数参数
     * @returns {Promise<{ token: string, auth: boolean }>} 返回当前令牌及当前权限
     * @description 有派生对象决定权限验证的逻辑
     */
    protected checkTokenAuth?(token: string, functionName: string, args: any[]): Promise<TokenAuth> {
        // 默认返回true,具有权限
        return Promise.resolve({ token: token, auth: true });
    }
    /** 调用 */
    call?(token: string, functionName: string, args: any[]): Promise<any> {
        // 找不到方法
        if (!this[functionName]) {
            throwError(
                ErrorStatus.ERROR_FUNCTION_NOT_FOUND,
                `当前服务没有[${functionName}]的方法`);
        }
        // 当前对象闭包
        let that = this;
        // 验证令牌权限
        return (this.checkTokenAuth(token, functionName, args) as Promise<TokenAuth>).then((check) => {
            // 设置当前用户
            setCurrentUserToken(token);
            if (check.auth) {
                return that[functionName].apply(that, args);
            } else {
                throwError(ErrorStatus.ERROR_NOT_AUTHORITY, '没有权限');
            }
        });
    }
}

/**
 * 名称:基础服务器
 * @description 所有服务器的基类，服务器是可以启动和停止的应用程序，服务器程序不应当阻塞主线程
 */
@addon('BaseServer', '基础服务器', '所有服务器的基类')
export class BaseServer extends BaseAddon {
    /**
     * 服务启动
     */
    start?(): void {

    }

    /**
     * 服务停止
     */
    stop?(): void {

    }

    /**
     * 服务重置
     */
    reset?(): void {
        this.stop();
        this.start();
    }
}