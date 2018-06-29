import * as express from 'express';
import * as http from 'http';
import * as session from 'express-session';
import * as mongo from 'connect-mongo';
import * as path from 'path';
import { ServerApplication, mainApplication } from './serverApp';
import { remoteCallServiceHandler } from './serverRemote';
import { addon, log } from "red-aop";

let MongoStore = mongo(session);

export let expressApp: express.Express;

/**
 * Express服务应用
 */
@addon('ExpressApplication', '服务应用设置', '包含各种资源的主服务应用实体对象')
export class ExpressApplication extends ServerApplication {

    startApplication?() {
        let app = express();
        let router = express.Router();
        expressApp = app;

        // 静态目录设定
        app.use(express.static(path.join(__dirname, '../../../build')));

        // 过滤服务文件夹,不能通过get请求访问
        app.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
            // 设置指定文件目录
            let server = /(\/server\/)/g;
            if (server.test(req.path)) {
                // 设置utf - 8编码格式
                res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
                res.end('请求非法目录文件');
            } else {
                next();
            }
        });

        // Session
        if (this.session) {
            // Session 中间件
            app.use(session({
                name: this.session.name,
                secret: this.session.secret,
                cookie: {
                    maxAge: this.session.maxAge
                },
                resave: false,
                saveUninitialized: true,
                store: new MongoStore({
                    url: this.session.url
                }),
            }));
        }
        log('service', `会话启动，会话名称：${this.session.name}`);

        // 注册远程调用服务
        router.post(
            '/remoteCall',
            function (req: express.Request, res: express.Response, next: express.NextFunction) {
                // 添加跨域
                // 添加跨域源，可以是指定IP
                res.header("Access-Control-Allow-Origin", "*");
                // 如果是自定义头部，需要添加该跨域头部
                // res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
                // 添加跨域的请求方式，仅只支持POST
                // res.header("Access-Control-Allow-Methods", "POST");
                next();
            },
            remoteCallServiceHandler);

        app.use(router);

        // 设置端口
        app.set('port', this.port);
        app.set('trust proxy', true);

        // 处理一些未捕获的异常，防止服务挂起
        process.on('uncaughtException', function (err: Error) {
            log('service', `服务端未捕获异常，${err.message || err.stack}`);
        });

        // 启动服务
        http.createServer(app).listen(app.get('port'), function () {
            log('app', `服务启动，监听端口：${app.get('port')}`);
        });
    }
}
