import * as TCP from 'net';
import { BaseServer } from './serverBase';
import { addon, log } from 'red-aop';

/**
 * 名称:Socket 服务
 * @description 提供Socket透明传输的服务
 */
@addon('SocketServer', 'Socket 服务', '提供Socket透明传输的服务')
export class SocketServer extends BaseServer {
    private tcp: TCP.Server;

    constructor(public port?: number, public hostName?: string) {
        super();
    }

    start?(): void {
        this.tcp = TCP.createServer((socket: TCP.Socket) => {
            try {
                // socket.write(buffer) 
                log('net', `接收到来自${socket.remoteAddress} : ${socket.remotePort}的连接`);
                if (this.connected) {
                    this.connected(socket);
                }
            } catch (error) {
                log('net', new Error(`建立连接时发生异常:${error}`));
            }
        });
        this.tcp.listen(this.port, this.hostName);
        log('net', `TCP服务器开始在端口${this.hostName} : ${this.port}监听`);
    }

    stop?(): void {
        this.tcp.close();
        log('net', `关闭监听端口${this.port}`);
    }

    /**
     * 连接建立
     * @param socket 套接字
     */
    connected?(socket: TCP.Socket): void;
}