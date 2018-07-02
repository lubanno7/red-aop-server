import * as express from 'express';
import * as http from 'http';
import * as session from 'express-session';
import * as mongo from 'connect-mongo';
import * as path from 'path';
import { ServerApplication } from './serverApp';
import { remoteCallServiceHandler } from './serverRemote';
import { addon, log } from "red-aop";

let MongoStore = mongo(session);

export let expressApp: express.Express;
export let mainApplication: ExpressApplication;

/**
 * Express服务应用
 * @author pao
 */
@addon('ExpressApplication', '服务应用设置', '包含各种资源的主服务应用实体对象')
export class ExpressApplication extends ServerApplication {

    startApplication?() {
        mainApplication = this;
        let app = express();
        let router = express.Router();
        expressApp = app;

        log('app', '设定静态目录');
        // 静态目录设定
        app.use(express.static(path.join(__dirname, '../../../build')));

        log('app', '过滤服务目录');
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
            log('app', `会话启动，会话名称：${this.session.name}`);
        }

        log('app', `注册远程调用服务`);
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

        log('app', `启动路由`);
        app.use(router);

        // 设置端口
        app.set('port', this.port);
        app.set('trust proxy', true);

        // 启动服务
        http.createServer(app).listen(app.get('port'), function () {
            log('app', `Express服务启动，监听端口：${app.get('port')}`);
        });
    }
}
