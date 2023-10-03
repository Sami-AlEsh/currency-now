"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const Log_1 = require("../entities/Log");
const User_1 = require("../entities/User");
const typeorm_1 = require("typeorm");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "./database.sqlite",
    synchronize: true,
    logging: false,
    entities: [User_1.User, Log_1.Log],
});
