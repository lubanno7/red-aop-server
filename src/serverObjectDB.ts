import { BaseService } from './serverBase';
import { addon, BaseAddon, extend, IDataService } from 'red-aop';
import { MongoClient, WriteOpResult, InsertWriteOpResult, Db } from 'typeorm';

/** 时间匹配正则表达式 */
export const DATE_REGEXP = /\$Date\$/;
/** 时间类型自定义 */
export const DATE_TYPE_SELF = '$Date$';
/** 时间类型判断条件 */
export const DATE_TYPE_STRING = '[object Date]';

/** 连接配置 */
export type ConnectionOption = {
    ip: string,
    port: string,
    database: string
};

/** 逻辑运算符 */
export enum LogicKeys {
    AND,
    OR
}

/** 数据过滤器接口 */
export interface IMongoDataFilter {
    /**
     * 获取条件
     * @param paramValues 参数 
     */
    getCondition(paramValues: {}): any;
}

/**
 * 名称:过滤器
 * @description 用于描述Mongo数据操作的过滤器
 * @author huyl
 */
@addon('BaseMongoDataFilter', 'Mongo过滤器基类', '用于描述Mongo数据操作的过滤器')
export class BaseMongoDataFilter extends BaseAddon implements IMongoDataFilter {
    /** 
     * 过滤器
     * @param name 名称
     * @param childrenFilters 子过滤器
     */
    constructor(public name?: string, public childrenFilters?: IMongoDataFilter[]) {
        super();
    }
    /** 获取提条件 */
    getCondition(paramValues: {}): any {
        let and = {}, or: any = { $or: [] };
        for (let index = 0, len = this.childrenFilters.length;
            index < len; index++) {
            let childrenFilter = this.childrenFilters[index];
            let logicKey = this.getLogicKey();
            let filterJson = childrenFilter.getCondition(paramValues);
            if (!filterJson) {
                continue;
            }
            // AND 逻辑
            if (!logicKey || logicKey === LogicKeys.AND) {
                extend(and, filterJson);
            }
            // OR 逻辑
            if (logicKey === LogicKeys.OR) {
                or.$or.push(filterJson);
            }
        }
        if (or.$or.length > 0) {
            return extend(and, or, true);
        } else {
            return and;
        }
    }
    /** 获取逻辑运算符 */
    protected getLogicKey(): any {
        // 默认AND逻辑
        return LogicKeys.AND;
    }
}

/**
 * 名称:And逻辑过滤器
 * @description 用于描述 Mongo 数据操作 AND 逻辑过滤器
 * @author huyl
 */
@addon('AndMongoDataFilter', 'And逻辑过滤器', '用于描述 Mongo 数据操作 AND 逻辑过滤器')
export class AndMongoDataFilter extends BaseMongoDataFilter {
    /** 
     * And逻辑过滤器
     * @param name 名称
     * @param childrenFilters 子过滤器
     */
    constructor(public name?: string, public childrenFilters?: IMongoDataFilter[]) {
        super(name, childrenFilters);
    }
    protected getLogicKey(): any {
        return LogicKeys.AND;
    }
}

/**
 * 名称:Or逻辑过滤器
 * @description 用于描述 Mongo 数据操作 OR 逻辑过滤器
 * @author huyl
 */
@addon('OrMongoDataFilter', 'Or逻辑过滤器', '用于描述 Mongo 数据操作 OR 逻辑过滤器')
export class OrMongoDataFilter extends BaseMongoDataFilter {

    /** 
     * And逻辑过滤器
     * @param name 名称
     * @param childrenFilters 子过滤器
     */
    constructor(public name?: string, public childrenFilters?: IMongoDataFilter[]) {
        super(name, childrenFilters);
    }
    protected getLogicKey(): any {
        return LogicKeys.OR;
    }
}

/**
 * 名称:字符串条件语句
 * @description 用于Mongo数据操作条件的最基础的语句
 * @author huyl
 */
@addon('StringMongoDataFilter', '字符串条件语句', '用于Mongo数据操作条件的最基础的语句')
export class StringMongoDataFilter extends BaseMongoDataFilter {
    /** 
     * 字符串条件语句 
     * @param name 名称
     * @param key 关键字
     * @param condition 条件，如'{key1:{0}}'
     */
    constructor(
        public name?: string,
        public key?: string,
        public condition?: string) {
        super(name);
    }

    getCondition(paramValues: {}) {
        if (!paramValues || !paramValues[this.key]) {
            return undefined;
        }
        let value = paramValues[this.key];
        let filterString = this.format(this.condition, value);
        return JSON.parse(filterString, function (key, value) {
            let reg = new RegExp(DATE_REGEXP);
            if (reg.test(value)) {
                return new Date(value.replace(reg, ''));
            }
            return value;
        });
    }

    /** 
     * 字符串格式化 
     * @description 需要处理特殊格式，如时间等
     */
    format(origin: string, ...args: any[]) {
        return origin.replace(/\{([1-9]\d*|0)\}/g, function (s, i) {
            // 时间类型
            if (Object.prototype.toString.call(args[i]) === DATE_TYPE_STRING) {
                let temp = [];
                temp.push(DATE_TYPE_SELF);
                // 通过JSON将时间转字符串，前后多了(')
                temp.push(JSON.stringify(args[i]).replace(/\'/g, ''));
                return temp.join('');
            }
            return args[i];
        });
    }
}

/**
 * 名称:命令
 * @description 用于描述Mongo数据操作的命令
 * @author huyl
 */
@addon('BaseMongoCommand', '命令', '用于描述Mongo数据操作的命令')
export class BaseMongoCommand extends BaseAddon {
    /** 
     * 命令
     * @param {string} name 命令名称
     * @param {string} collection 集合名称
     * @param {BaseMongoDataFilter} filters 过滤器
     */
    constructor(public name?: string, public collection?: string, public filters?: BaseMongoDataFilter) {
        super();
    }
    /** 获取条件 */
    getCondition(paramValues?: {}) {
        if (!paramValues || !this.filters || Object.keys(paramValues).length === 0) {
            return {};
        }
        return this.filters.getCondition(paramValues);
    }
}

/**
 * 名称:Mongo DB 连接池
 * @description 用于操作Mongo DB连接信息的对象
 * @author huyl
 */
@addon('MongoConnectionPool', 'Mongo DB 连接池', '用于操作Mongo DB连接信息的对象')
export class MongoConnectionPool extends BaseAddon {
    /** 连接信息 */
    protected get uri(): string {
        if (typeof this.conn === 'object') {
            return `mongodb://${this.conn.ip}:${this.conn.port}`;
        }

        if (typeof this.conn === 'string') {
            return this.conn;
        }

        return undefined;
    }
    /** 创建连接 */
    public get connection(): Promise<Db> {
        return MongoClient.connect(this.uri);
    }
    /** 获取数据库名称 */
    public get dbName() {
        return typeof this.conn === 'string'
            ? this.database
            : typeof this.conn === 'object'
                ? this.conn.database
                : undefined;
    }
    /** Mongo DB 连接池 */
    constructor(protected conn: ConnectionOption | string, protected database?: string) {
        super();
    }
}

/**
 * 名称:Mongo DB 数据存储
 * @description 完成Mongo DB主要增删查改等操作
 * @author huyl
 */
@addon('MongoStorage', 'Mongo DB 数据存储', '完成Mongo DB主要增删查改等操作')
export class MongoStorage extends BaseAddon {
    /** Mongo DB 数据存储 */
    constructor(protected pool: MongoConnectionPool) {
        super();
    }
    /** 
     * 查询
     * @param {string} collection 集合名称
     * @param {{}} where 条件
     * @param {{}} option 统计配置
     * @returns {Promise<any[]>} 结果
     */
    select?(collection: string, where?: {}, option?: { skip: number, limit: number }): Promise<any[]> {
        return this.pool.connection.then((client) => {
            const skip = option && option.skip ? option.skip : 0,
                limit = option && option.limit ? option.limit : 0,
                condition = where ? where : {};
            let db = client.db(this.pool.dbName);
            let col = db.collection(collection);
            return col
                .find(condition)    // 条件筛选
                .skip(skip)         // 跳过行数，默认0
                .limit(limit)       // 返回行数，默认0，查找全部
                .toArray()          // 返回结果
                .then(doc => {
                    client.close(); // 关闭客户端连接
                    return doc;
                }).catch(error => { // 连接已经打开，必须捕获错误，关闭连接
                    client.close(); // 关闭客户端连接
                    throw error;    // 抛出错误
                });
        }).catch(error => {
            throw error;
        });
    }
    /**
     * 更新
     * @param {string} collection 集合名称
     * @param {any[]} document 文档集合
     * @returns {Promise<WriteOpResult>} 结果
     */
    update(collection: string, document?: Object): Promise<WriteOpResult> {
        return this.pool.connection.then(client => {
            let db = client.db(this.pool.dbName);
            return db.collection(collection).update({}, document).then(result => {
                client.close();
                return result;
            }).catch(error => {
                client.close();
                throw error;
            });
        }).catch(error => {
            throw error;
        });
    }
    findMardify?(collection: string, where?: {}, document?: Object): Promise<any> {
        return this.pool.connection.then(client => {
            let db = client.db(this.pool.dbName);
            return db.collection(collection).update({}, document).then(result => {
                client.close();
                return result;
            }).catch(error => {
                client.close();
                throw error;
            });
        }).catch(error => {
            throw error;
        });
    }
    /**
     * 添加
     * @param collection 集合名称
     * @param documents 文档列表
     */
    insert(collection: string, documents: Object[]): Promise<InsertWriteOpResult> {
        return this.pool.connection.then((client) => {
            let db = client.db(this.pool.dbName);
            return db.createCollection(collection).then(col => {
                return col.insertMany(documents).then(value => {
                    client.close();
                    return value;
                });
            }).catch(error => {
                client.close();
                throw error;
            });
        }).catch(error => {
            throw error;
        });
    }
    /**
     * 删除
     * @param {string} collection 集合名称
     * @param {any[]} where 条件
     * @returns {Promise<any>} 结果
     */
    delete(collection: string, where?: {}): Promise<any> {
        return undefined;
    }
    /**
     * 获取集合文档数量
     * @param collection 集合名称
     * @param where 条件
     */
    count(collection: string, where?: {}): Promise<number> {
        return this.pool.connection.then((client) => {
            const condition = where ? where : {};
            let db = client.db(this.pool.dbName);
            let col = db.collection(collection);
            return col.count(condition).then(num => {
                client.close();
                return num;
            }).catch(error => {
                client.close();
                throw error;
            });
        }).catch(error => {
            throw error;
        });
    }
}

/**
 * 名称:Mongo 数据查询服务
 * @description 提供Mongo数据库查询的服务
 * @author huyl
 */
@addon('MongoQueryService', 'Mongo 数据服务', '提供Mongo数据库查询的服务')
export class MongoQueryService extends BaseService implements IDataService {
    /** 命令集合 */
    commandList?: BaseMongoCommand[];
    /** 
     * Mongo 数据服务
     * @param storage 数据存储
     */
    constructor(public storage?: MongoStorage) {
        super();
        this.commandList = [];
    }
    /**
     * 检查合法性
     * @protected
     * @param {string} command 命令ID
     * @returns {BaseMongoCommand} 
     */
    protected checkValidity?(command: string): BaseMongoCommand {
        if (!this.storage) { throw new Error('当前服务没有数据库存储'); }
        if (!command) { throw new Error('查询的命令不能为空'); }
        // 根据命令ID获取命令
        let cmd = this.commandList.find((item) => {
            return item.id === command;
        });
        if (!cmd) { throw new Error(`当前服务没有[${command}]的命令`); }
        if (!cmd.collection) { throw new Error(`该命令不存在集合名称`); }
        return cmd;
    }
    /**
     * 查询
     * @param {string} command 命令ID
     * @param {{}} paramValues 参数
     * @param {number} startIndex 开始索引
     * @param {number} maxCount 最大行数,默认0为查询全部数据
     */
    query(command: string, paramValues: {}, startIndex: number = 0, maxCount: number = 0): Promise<any[]> {
        // 检查有效性并获取命令
        let cmd = this.checkValidity(command);
        // 获取条件
        let where = cmd.getCondition(paramValues);
        // 通过存储执行查询
        return this.storage.select(cmd.collection, where, { skip: startIndex, limit: maxCount });
    }
    /**
     * 获取数量
     * @param {string} command 命令ID
     * @param {{}} paramValues 参数
     */
    count(command: string, paramValues: {}): Promise<number> {
        // 检查有效性并获取命令
        let cmd = this.checkValidity(command);
        // 获取条件
        let where = cmd.getCondition(paramValues);

        return this.storage.count(cmd.collection, where);
    }
}