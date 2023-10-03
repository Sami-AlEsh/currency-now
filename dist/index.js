"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const Bot_1 = require("./Bot");
const data_source_1 = require("./config/data-source");
(0, dotenv_1.config)();
data_source_1.AppDataSource.initialize()
    .then(() => {
    const bot = new Bot_1.Bot();
    bot.setup();
})
    .catch((error) => console.log(error));
