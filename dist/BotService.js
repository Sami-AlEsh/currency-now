"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const lodash_1 = require("lodash");
const Log_1 = require("./entities/Log");
const User_1 = require("./entities/User");
const data_source_1 = require("./config/data-source");
class BotService {
    bot;
    static commands = [
        { command: "start", description: "Restart the bot" },
        { command: "now", description: "Get currency rates now" },
        { command: "gold", description: "Get gold rates now" },
        {
            command: "convert",
            description: "Convert value from currency to SYP",
        },
        { command: "about", description: "Learn more about the bot" },
    ];
    constructor(bot) {
        this.bot = bot;
    }
    async getUser(userId) {
        if ((0, lodash_1.isUndefined)(userId))
            return null;
        const fetchedUser = await data_source_1.AppDataSource.manager.findOne(User_1.User, {
            where: {
                telegramId: userId,
            },
        });
        return fetchedUser;
    }
    createUser(userId, username, firstName, lastName, languageCode) {
        const newUser = new User_1.User();
        newUser.telegramId = userId;
        newUser.username = username;
        newUser.firstName = firstName;
        newUser.lastName = lastName;
        newUser.languageCode = languageCode;
        return data_source_1.AppDataSource.manager.save(newUser);
    }
    createLog(user, command) {
        const log = new Log_1.Log();
        log.user = user;
        log.command = command;
        return data_source_1.AppDataSource.manager.save(log);
    }
    async getCurrencies() {
        const res = await axios_1.default.get(process.env.BASE_URL + Date.now());
        return res.data.map((c) => {
            return { name: c.name, buy: c.ask, sell: c.bid };
        });
    }
    parseCommandParams(msgText) {
        return msgText.split(" ").slice(1);
    }
    processConvertParams(params) {
        const [value, from, to = "SYP"] = params;
        if ((0, lodash_1.isUndefined)(from) ||
            (0, lodash_1.isUndefined)(to) ||
            from.length !== 3 ||
            to.length !== 3)
            throw new Error("Invalid parameters");
        return {
            value: parseFloat(value),
            from: String(from).slice(0, 3),
            to: String(to).slice(0, 3),
        };
    }
    convertValue(value, from, to, currencies) {
        const fromCurrency = currencies.find((c) => c.name === from.toUpperCase());
        if ((0, lodash_1.isUndefined)(fromCurrency)) {
            throw new Error("Invalid source Currency!");
        }
        return value * fromCurrency.buy;
    }
    async start(msg) {
        const user = msg.from;
        // Register new users
        const fetchedUser = await this.getUser(user?.id);
        if ((0, lodash_1.isNull)(fetchedUser))
            this.createUser(user?.id ?? 0, user?.username ?? "", user?.first_name ?? "", user?.last_name ?? "", user?.language_code ?? "").then((createdUser) => {
                // Create user command log
                this.createLog(createdUser, "start");
                // Inform Admin about the new user
                this.bot.sendMessage(parseInt(process.env.ADMIN_ID), "New User Registered 🤵\n" + JSON.stringify(createdUser, undefined, 2));
            });
        this.bot.sendMessage(msg.chat.id, "Thanks for using this bot.\nuse /now to see last report ...");
    }
    async about(msg) {
        this.bot.sendMessage(msg.chat.id, "<< Made with ♥ by Sami >>");
        // log the command
        const fetchedUser = await this.getUser(msg.from?.id);
        if (!(0, lodash_1.isNull)(fetchedUser))
            this.createLog(fetchedUser, "about");
    }
    async now(msg) {
        const user = await this.getUser(msg.from?.id);
        if (user.isBlocked) {
            this.bot.sendMessage(msg.chat.id, "Sorry, you are not allowed to use this bot anymore.");
            return;
        }
        const currencies = await this.getCurrencies();
        const currenciesStrings = currencies.map((c) => {
            const currencyName = String(c.name).padEnd(3, " ");
            const buy = String(c.buy).padEnd(5, " ");
            const sell = String(c.sell).padEnd(5, " ");
            return `${currencyName} : ${buy} | ${sell}`;
        });
        const formattedMsg = `Report on ${new Date().toLocaleDateString()}:\n\n<code>${currenciesStrings.join("\n")}</code>`;
        this.bot.sendMessage(msg.chat.id, formattedMsg, { parse_mode: "HTML" });
        this.createLog(user, "now");
    }
    async gold(msg) {
        const user = await this.getUser(msg.from?.id);
        if (user.isBlocked) {
            this.bot.sendMessage(msg.chat.id, "Sorry, you are not allowed to use this bot anymore.");
            return;
        }
        const res = await axios_1.default.get(process.env.GOLD_BASE_URL);
        const goldPrices = String(res.data).match(/<strong>[0-9]+[.,][0-9]+<\/strong>/gm) ?? [];
        const goldMsg = `Gold Report on ${new Date().toLocaleDateString()}\n\n` +
            `<code>` +
            `14 Karat: ${goldPrices[1]} SYP\n` +
            `18 Karat: ${goldPrices[3]} SYP\n` +
            `21 Karat: ${goldPrices[5]} SYP\n` +
            `22 Karat: ${goldPrices[7]} SYP\n` +
            `24 Karat: ${goldPrices[9]} SYP\n` +
            `\nOunce: ${goldPrices[10]}$` +
            `</code>`;
        this.bot.sendMessage(msg.chat.id, goldMsg, { parse_mode: "HTML" });
        this.createLog(user, "gold");
    }
    async convert(msg) {
        const user = await this.getUser(msg.from?.id);
        if (user.isBlocked) {
            this.bot.sendMessage(msg.chat.id, "Sorry, you are not allowed to use this bot anymore.");
            return;
        }
        try {
            this.createLog(user, "convert");
            const params = this.parseCommandParams(msg.text);
            const { value, from, to } = this.processConvertParams(params);
            const currencies = await this.getCurrencies();
            const convertedValue = this.convertValue(value, from, to, currencies);
            this.bot.sendMessage(msg.chat.id, `${convertedValue} SYP`);
        }
        catch {
            this.bot.sendMessage(msg.chat.id, "Invalid params passed to convert!, pls use the following syntax: /convert {value} {currency}");
        }
    }
}
exports.default = BotService;
