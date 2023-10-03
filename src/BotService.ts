import axios from "axios";
import { isNull, isUndefined } from "lodash";
import TelegramBot from "node-telegram-bot-api";

import { Log } from "./entities/Log";
import { User } from "./entities/User";
import { AppDataSource } from "./config/data-source";
import { Currency } from "./interfaces/currency.interface";

export default class BotService {
  static readonly commands: TelegramBot.BotCommand[] = [
    { command: "start", description: "Restart the bot" },
    { command: "now", description: "Get currency rates now" },
    { command: "gold", description: "Get gold rates now" },
    {
      command: "convert",
      description: "Convert value from currency to SYP",
    },
    { command: "about", description: "Learn more about the bot" },
  ];

  constructor(private bot: TelegramBot) {}

  private async getUser(userId: number | undefined): Promise<User | null> {
    if (isUndefined(userId)) return null;

    const fetchedUser = await AppDataSource.manager.findOne(User, {
      where: {
        telegramId: userId,
      },
    });

    return fetchedUser;
  }

  private createUser(
    userId: number,
    username: string,
    firstName: string,
    lastName: string,
    languageCode: string
  ): Promise<User> {
    const newUser = new User();
    newUser.telegramId = userId;
    newUser.username = username;
    newUser.firstName = firstName;
    newUser.lastName = lastName;
    newUser.languageCode = languageCode;

    return AppDataSource.manager.save(newUser);
  }

  private createLog(user: User, command: string): Promise<Log> {
    const log = new Log();
    log.user = user;
    log.command = command;
    return AppDataSource.manager.save(log);
  }

  private async getCurrencies(): Promise<[Currency]> {
    const res = await axios.get(process.env.BASE_URL! + Date.now());

    return res.data.map((c: { name: string; ask: number; bid: number }) => {
      return { name: c.name, buy: c.ask, sell: c.bid };
    });
  }

  private parseCommandParams(msgText: string): string[] {
    return msgText.split(" ").slice(1);
  }

  private processConvertParams(params: string[]): {
    from: string;
    to: string;
    value: number;
  } {
    const [value, from, to = "SYP"] = params;

    if (
      isUndefined(from) ||
      isUndefined(to) ||
      from.length !== 3 ||
      to.length !== 3
    )
      throw new Error("Invalid parameters");

    return {
      value: parseFloat(value),
      from: String(from).slice(0, 3),
      to: String(to).slice(0, 3),
    };
  }

  private convertValue(
    value: number,
    from: string,
    to: string,
    currencies: Currency[]
  ): number {
    const fromCurrency = currencies.find((c) => c.name === from.toUpperCase());

    if (isUndefined(fromCurrency)) {
      throw new Error("Invalid source Currency!");
    }

    return value * fromCurrency.buy;
  }

  public async start(msg: TelegramBot.Message): Promise<void> {
    const user = msg.from;

    // Register new users
    const fetchedUser = await this.getUser(user?.id);
    if (isNull(fetchedUser))
      this.createUser(
        user?.id ?? 0,
        user?.username ?? "",
        user?.first_name ?? "",
        user?.last_name ?? "",
        user?.language_code ?? ""
      ).then((createdUser: User) => {
        // Create user command log
        this.createLog(createdUser, "start");

        // Inform Admin about the new user
        this.bot.sendMessage(
          parseInt(process.env.ADMIN_ID!),
          "New User Registered 🤵\n" + JSON.stringify(createdUser, undefined, 2)
        );
      });

    this.bot.sendMessage(
      msg.chat.id,
      "Thanks for using this bot.\nuse /now to see last report ..."
    );
  }

  public async about(msg: TelegramBot.Message): Promise<void> {
    this.bot.sendMessage(msg.chat.id, "<< Made with ♥ by Sami >>");

    // log the command
    const fetchedUser = await this.getUser(msg.from?.id);
    if (!isNull(fetchedUser)) this.createLog(fetchedUser, "about");
  }

  public async now(msg: TelegramBot.Message): Promise<void> {
    const user = await this.getUser(msg.from?.id);

    if (user!.isBlocked) {
      this.bot.sendMessage(
        msg.chat.id,
        "Sorry, you are not allowed to use this bot anymore."
      );
      return;
    }

    const currencies = await this.getCurrencies();

    const currenciesStrings: string[] = currencies.map((c: Currency) => {
      const currencyName = String(c.name).padEnd(3, " ");
      const buy = String(c.buy).padEnd(5, " ");
      const sell = String(c.sell).padEnd(5, " ");

      return `${currencyName} : ${buy} | ${sell}`;
    });

    const formattedMsg = `Report on ${new Date().toLocaleDateString()}:\n\n<code>${currenciesStrings.join(
      "\n"
    )}</code>`;

    this.bot.sendMessage(msg.chat.id, formattedMsg, { parse_mode: "HTML" });

    this.createLog(user!, "now");
  }

  public async gold(msg: TelegramBot.Message): Promise<void> {
    const user = await this.getUser(msg.from?.id);

    if (user!.isBlocked) {
      this.bot.sendMessage(
        msg.chat.id,
        "Sorry, you are not allowed to use this bot anymore."
      );
      return;
    }

    const res = await axios.get(process.env.GOLD_BASE_URL!);

    const goldPrices: RegExpMatchArray | [] =
      String(res.data).match(/<strong>[0-9]+[.,][0-9]+<\/strong>/gm) ?? [];

    const goldMsg =
      `Gold Report on ${new Date().toLocaleDateString()}\n\n` +
      `<code>` +
      `14 Karat: ${goldPrices[1]} SYP\n` +
      `18 Karat: ${goldPrices[3]} SYP\n` +
      `21 Karat: ${goldPrices[5]} SYP\n` +
      `22 Karat: ${goldPrices[7]} SYP\n` +
      `24 Karat: ${goldPrices[9]} SYP\n` +
      `\nOunce: ${goldPrices[10]}$` +
      `</code>`;

    this.bot.sendMessage(msg.chat.id, goldMsg, { parse_mode: "HTML" });

    this.createLog(user!, "gold");
  }

  public async convert(msg: TelegramBot.Message): Promise<void> {
    const user = await this.getUser(msg.from?.id);

    if (user!.isBlocked) {
      this.bot.sendMessage(
        msg.chat.id,
        "Sorry, you are not allowed to use this bot anymore."
      );
      return;
    }

    try {
      this.createLog(user!, "convert");
      const params = this.parseCommandParams(msg.text!);
      const { value, from, to } = this.processConvertParams(params);
      const currencies = await this.getCurrencies();
      const convertedValue = this.convertValue(value, from, to, currencies);
      this.bot.sendMessage(msg.chat.id, `${convertedValue} SYP`);
    } catch {
      this.bot.sendMessage(
        msg.chat.id,
        "Invalid params passed to convert!, pls use the following syntax: /convert {value} {currency}"
      );
    }
  }
}
