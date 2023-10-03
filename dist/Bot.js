"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bot = void 0;
const lodash_1 = require("lodash");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const BotService_1 = __importDefault(require("./BotService"));
class Bot {
    bot;
    botService;
    constructor() {
        // Initialize the bot
        this.bot = new node_telegram_bot_api_1.default(process.env.BOT_TOKEN ?? "", { polling: true });
        this.botService = new BotService_1.default(this.bot);
    }
    setupHandlers() {
        for (const commandObj of BotService_1.default.commands) {
            if ((0, lodash_1.isUndefined)(this.botService[commandObj.command]))
                throw new Error(`command ${commandObj.command} is not defined in BotService`);
            // Dynamically call the corresponding command handler
            this.bot.onText(new RegExp(`/${commandObj.command}`), this.botService[commandObj.command].bind(this.botService));
        }
    }
    setup() {
        // Register bot commands handlers
        this.bot.setMyCommands(BotService_1.default.commands);
        // Register bot messages handlers
        this.setupHandlers();
    }
}
exports.Bot = Bot;
