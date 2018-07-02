/**
 * 1、导出server base模块
 */
import {
    removeBOM,
    saveObject,
    loadObject,
    prepareConfig,
    GlobalServers,
    GlobalServices,
    ServerInfo,
    ServiceInfo,
    registerServers,
    registerServer,
    getServerByName,
    registerServices,
    registerService,
    getServiceByName,
    TokenAuth,
    BaseService,
    BaseServer
} from "./src/serverBase";

export {
    removeBOM,
    saveObject,
    loadObject,
    prepareConfig,
    GlobalServers,
    GlobalServices,
    ServerInfo,
    ServiceInfo,
    registerServers,
    registerServer,
    getServerByName,
    registerServices,
    registerService,
    getServiceByName,
    TokenAuth,
    BaseService,
    BaseServer
};

/**
 * 2、导出server app模块
 */
import { AppSession, ServerApplication } from "./src/serverApp";

export { AppSession, ServerApplication };

/**
 * 3、导出exprss app模块
 */
import { ExpressApplication, expressApp } from "./src/expressApp";

export { ExpressApplication, expressApp };

/**
 * 4、导出serverObjectDB 模块
 */
import {
    ConnectionOption,
    IMongoDataFilter,
    LogicKeys,
    BaseMongoDataFilter,
    AndMongoDataFilter,
    OrMongoDataFilter,
    StringMongoDataFilter,
    BaseMongoCommand,
    MongoConnectionPool,
    MongoStorage,
    MongoQueryService
} from "./src/serverObjectDB";

export {
    ConnectionOption,
    IMongoDataFilter,
    LogicKeys,
    BaseMongoDataFilter,
    AndMongoDataFilter,
    OrMongoDataFilter,
    StringMongoDataFilter,
    BaseMongoCommand,
    MongoConnectionPool,
    MongoStorage,
    MongoQueryService
};

/**
 * 5、导出serverRelationDB模块
 */
import {
    IRelationDataFilter,
    BaseRelationDataFilter,
    AndRelationDataFilter,
    OrRelationDataFilter,
    SqlRelationDataFilter,
    RelationDataCommand,
    DatabaseConnection,
    RelationDataService
} from "./src/serverRelationDB";

export {
    IRelationDataFilter,
    BaseRelationDataFilter,
    AndRelationDataFilter,
    OrRelationDataFilter,
    SqlRelationDataFilter,
    RelationDataCommand,
    DatabaseConnection,
    RelationDataService
};

/**
 * 6、导出serverRemote模块
 */
import {
    request,
    remoteCallServiceHandler
} from "./src/serverRemote";

export {
    request,
    remoteCallServiceHandler
};

/**
 * 7、导出serverSecurity模块
 */
import {
    verify,
    sign,
    setCurrentUserToken,
    UserInfo,
    UserPasswordLoginService
} from "./src/serverSecurity";

export {
    verify,
    sign,
    setCurrentUserToken,
    UserInfo,
    UserPasswordLoginService
};

/**
 * 8、导出server socket模块
 */
import { SocketServer } from "./src/serverSocket";

export { SocketServer };