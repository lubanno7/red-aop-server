import { ServiceInfo, registerServices, ServerInfo, registerServers } from './serverBase';
import { addon, Application } from 'red-aop';

/**
 * 主应用程序
 */
export let mainApplication: ServerApplication;

/**
 * 名称:应用Session配置
 * @description 用于配置服务应用的Session
 */
export class AppSession {
    /**
     * 应用Session配置
     * @param name 名称（英文）
     * @param secret 密钥
     * @param privateKey 密钥 
     * @param maxAge 有效期
     * @param url 存储地址
     */
    constructor(
        public name: string,
        public secret: string,
        public privateKey: string,
        public maxAge: number,
        public url: string) {
    }
}

/**
 * 服务应用
 */
@addon('ServerApplication', '服务应用设置', '包含各种资源的主服务应用实体对象')
export class ServerApplication extends Application {
    /**
     * session配置
     */
    session?: AppSession;

    /**
     * 服务应用设置
     * @param port 端口
     * @param services 服务列表
     */
    constructor(public port?: number, public services?: ServiceInfo[], public servers?: ServerInfo[]) {
        super();
        // 端口默认3000
        this.port = port || 3000;

        for (let device of services) {
            this.serviceList.set(device.serviceName, device.serviceObject);
        }
    }

    /**
     * 注册服务
     */
    registerServices?(): void {
        if (this.services) {
            registerServices(this.services);
        }
    }

    /**
     * 运行服务器
     */
    runServers?(): void {
        if (this.servers) {
            registerServers(this.servers);
        }

        for (let server of this.servers) {
            server.serverObject.start();
        }
    }

    /**
     * 启动应用
     */
    startApplication?(): void {

    }

    /**
     * 运行
     */
    run?(): void {
        super.run();
        mainApplication = this;

        this.registerServices();

        this.runServers();

        this.startApplication();
    }
}