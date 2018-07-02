import 'reflect-metadata';
import { ConnectionOptions, Connection, ConnectionManager, getConnectionManager } from 'typeorm';
import { BaseService } from './serverBase';
import { addon, BaseAddon, log, jsonConvertDataTable, IDataService } from 'red-aop';

/**
 * 默认数据库名称
 */
const defaultDatabaseName = 'default';

/**
 * 数据过滤器接口
 * @author huyl
 */
export interface IRelationDataFilter {
    /**
     * 获取运算符
     */
    getLogicSign?(): string;
    /**
     * 获取过滤语句
     * @param paramValues 参数
     */
    getFilterSql?(paramValues: {} | any): string;
    /**
     * 获取参数
     */
    getParameters?(paramValues: {} | any): Array<any>;
}

/**
 * 数据过滤器
 * @author huyl
 */
@addon('BaseRelationDataFilter', '数据过滤器', '数据过滤器')
export class BaseRelationDataFilter extends BaseAddon implements IRelationDataFilter {
    /**
     * 子过滤器列表
     */
    childFilters: IRelationDataFilter[];
    /**
     * 过滤参数
     */
    parameters?: any[] = undefined;
    /**
     * 获取过滤语句
     * @param paramValues 参数
     */
    getFilterSql?(paramValues: {} | any): string {
        let where: string = undefined;
        this.parameters = [];
        // 当前过滤器对象
        let that = this;
        if (that.childFilters) {
            let composite = false;
            // 遍历子过滤器列表,根据传入参数返回过滤语句,并拼接
            // 拼接完后,如果是组合型的过滤语句则加()返回
            for (let filter of that.childFilters) {
                let filterSql = filter.getFilterSql(paramValues);
                let param = filter.getParameters(paramValues);
                if (filterSql) {
                    if (where) {
                        where += ` ${that.getLogicSign()} ${filterSql}`;
                        composite = true;
                    } else {
                        where = filterSql;
                        this.parameters = [];
                    }
                    this.parameters = this.parameters.concat(param);
                }
            }
            if (composite) {
                where = ` (${where}) `;
            }
        }
        return where;
    }
    /**
     * 获取过滤参数
     * @param paramValues 参数
     */
    getParameters?(paramValues: {} | any): Array<any> {
        return this.parameters;
    }
    /**
     * 获取运算符
     */
    getLogicSign?(): string;
    /**
     * AND逻辑运算
     * @param filters 表达式
     * @remark 传入的表示式可以是sqlFilter或者baseDataFilter,
     * 如果是baseDataFilter,则baseDataFilter生成表达式会用()闭包
     * 例如(sqlfilter,baseDataFilter)生成结果(sqlFilterSql and ( baseDataFilterSql ) )
     */
    and?(...filters: IRelationDataFilter[]): BaseRelationDataFilter {
        if (!this.childFilters) {
            this.childFilters = [];
        }
        let andFilters = new AndRelationDataFilter();
        andFilters.childFilters = [];
        for (let f of filters) {
            andFilters.childFilters.push(f);
        }
        this.childFilters.push(andFilters);
        return this;
    }

    /**
     * OR逻辑运算
     * @param filters 表达式
     * @remark 和and方法一样,只是最后是使用OR的逻辑运算符
     */
    or?(...filters: IRelationDataFilter[]): BaseRelationDataFilter {
        if (!this.childFilters) {
            this.childFilters = [];
        }
        let orFilters = new OrRelationDataFilter();
        orFilters.childFilters = [];
        for (let f of filters) {
            orFilters.childFilters.push(f);
        }
        this.childFilters.push(orFilters);
        return this;
    }

    /**
     * 添加筛选类型的过滤条件
     * @param filters 筛选类型的过滤条件
     * @remark 筛选类型:group by/having/limit等
     */
    add?(...filters: IRelationDataFilter[]): BaseRelationDataFilter {
        if (!this.childFilters) {
            this.childFilters = [];
        }
        for (let f of filters) {
            this.childFilters.push(f);
        }
        return this;
    }
}

/**
 * AND逻辑运算过滤器
 * @author huyl
 */
@addon('AndRelationDataFilter', 'AND逻辑运算过滤器', 'AND逻辑运算过滤器')
export class AndRelationDataFilter extends BaseRelationDataFilter implements IRelationDataFilter {
    getLogicSign?(): string {
        return 'AND';
    }
}

/**
 * OR逻辑运算过滤器
 * @author huyl
 */
@addon('OrRelationDataFilter', 'OR逻辑运算过滤器', 'OR逻辑运算过滤器')
export class OrRelationDataFilter extends BaseRelationDataFilter implements IRelationDataFilter {
    getLogicSign?(): string {
        return 'OR';
    }
}

/**
 * SQL语句过滤器
 * @author huyl
 */
@addon('SqlRelationDataFilter', 'SQL语句过滤器', 'SQL语句过滤器')
export class SqlRelationDataFilter extends BaseAddon implements IRelationDataFilter {
    /**
     * SQL语句过滤器
     * @param fieldKey 字段关键字
     * @param sql SQL过滤语句
     * @param caption 标题
     */
    constructor(public fieldKey: string, public sql: string, public caption?: string) {
        super();
    }
    /**
     * 获取过滤语句
     * @param paramValues 参数
     */
    getFilterSql?(paramValues: {} | any): string {
        try {
            if (paramValues && paramValues[this.fieldKey]) {
                return this.sql;
            }
        } catch (e) {
            log('SQL数据过滤器', '获取过滤语句异常');
        }
        return undefined;
    }
    /**
     * 获取参数
     * @param paramValues 参数列表
     */
    getParameters?(paramValues: {} | any): Array<any> {
        try {
            if (paramValues && paramValues[this.fieldKey]) {
                let params: Array<any> = [];
                params.push(paramValues[this.fieldKey]);
                return params;
            }
        } catch (e) {
            log('SQL数据过滤器', '获取参数异常');
        }
        return undefined;
    }
}

/**
 * 数据命令
 * @author huyl
 */
@addon('RelationDataCommand', '数据命令', '数据命令')
export class RelationDataCommand extends BaseAddon {
    /** 表名 */
    tableName?: string;
    /** 是否为多表查询(默认为多表查询) */
    isMultiTableQuery?: boolean = true;
    /** 数据过滤器 */
    dataFilter?: BaseRelationDataFilter[];
    /** TRUE条件过滤字符串 */
    private trueFilterString?: string = '1=1';
    /** 参数 */
    private parameters?: any[] = undefined;
    /**
     * 数据命令
     * @param id 唯一标识
     * @param name 名称
     * @param primaryKeyFields 主键
     * @param sql SQL语句
     */
    constructor(public id?: string, public name?: string, public primaryKeyFields?: string[], public sql?: string) {
        super(id);
    }

    /**
     * 获取命令字符串
     * @param paramValues 查询参数
     */
    getCommandText?(paramValues: {}): string {
        if (!this.dataFilter) {
            return this.sql;
        }

        let filterStrings: string[] = [];
        this.parameters = [];
        for (let filter of this.dataFilter) {
            let filterString = filter.getFilterSql(paramValues);
            let param = filter.getParameters(paramValues);
            if (!filterString || filterString === '') {
                filterString = this.trueFilterString;
            }
            if (param) {
                this.parameters = this.parameters.concat(param);
            }
            filterStrings.push(filterString);
        }
        // 带不定参数方法需要用apply传递数组
        return this.sql.format.apply(this.sql, filterStrings);
    }
    /**
     * 获取过滤参数
     */
    getParameters?(): any[] {
        return this.parameters;
    }
}

/**
 * 数据连接对象
 * @author huyl
 */
@addon('DatabaseConnection', '数据库连接对象', '数据库连接对象')
export class DatabaseConnection extends BaseAddon {

    /**
     * 数据库连接配置
     * @description 可以是连接的字符串，或者连接的配置对象
     */
    dbConnection?: ConnectionOptions;
    /** 当前TypeORM的连接对象 */
    private _currentConnection?: Connection = undefined;
    /** 数据连接对象管理器 */
    private databaseManager: ConnectionManager;
    /** 连接数据库 */
    async connect?(): Promise<Connection> {
        if (!this.databaseManager) {
            this.databaseManager = getConnectionManager();
        }
        if (this.dbConnection) {
            // 当前数据库连接的名称
            let databaseName = this.dbConnection.name ? this.dbConnection.name : defaultDatabaseName;
            if (this.databaseManager.has(databaseName)) {
                this._currentConnection = this.databaseManager.get(databaseName);
            } else {
                this._currentConnection = this.databaseManager.create(this.dbConnection);
            }
        }
        // 关闭
        if (this._currentConnection.isConnected) {
            await this._currentConnection.close();
        }
        // 返回连接的Promise对象
        return await this._currentConnection.connect();
    }
}

/**
 * 关系型数据服务
 * @author huyl
 */
@addon('RelationDataService', '关系型数据服务', '操作关系型数据库,实现数据操作的服务')
export class RelationDataService extends BaseService implements IDataService {
    /** 数据连接信息 */
    connection: ConnectionOptions | any;
    /** 命令列表 */
    commandList: RelationDataCommand[];
    /**
     * 获取命令信息
     * @param commandID 命令ID
     */
    getCommandByID?(commandID: string): RelationDataCommand {
        if (this.commandList) {
            for (let cmd of this.commandList) {
                if (cmd.id === commandID) {
                    return cmd;
                }
            }
        }
        return undefined;
    }
    /**
     * 查询
     * @param params 查询参数
     */
    query(command: string, params?: {}): Promise<any> {
        // 数据库连接对象
        let conn: DatabaseConnection = new DatabaseConnection();
        conn.dbConnection = this.connection;
        try {
            // 获取命令,ID则获取
            let cmd = this.getCommandByID(command);
            if (!cmd) {
                throw new Error(`找不到[${command}]的命令`);
            }
            // 待执行的SQL语句
            let executeSql = cmd.getCommandText(params);
            // 查询参数
            let param = cmd.getParameters();
            return conn.connect()
                .then(connection => {
                    return connection.query(executeSql, param);
                })
                .then(result => {
                    return jsonConvertDataTable(result, cmd.tableName, cmd.primaryKeyFields);
                })
                .catch(error => {
                    throw new Error(`执行语句[${executeSql}]，发生异常:${error.message}`);
                });
        } catch (error) {
            throw error;
        }
    }
}
