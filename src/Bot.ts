import { isUndefined } from "lodash";
import TelegramBot from "node-telegram-bot-api";

import BotService from "./BotService";

export class Bot {
  private bot: TelegramBot;
  private botService: BotService;

  constructor() {
    // Initialize the bot
    this.bot = new TelegramBot(process.env.BOT_TOKEN ?? "", { polling: true });
    this.botService = new BotService(this.bot);
  }

  private setupHandlers(): void {
    for (const commandObj of BotService.commands) {
      if (isUndefined((this.botService as any)[commandObj.command]))
        throw new Error(
          `command ${commandObj.command} is not defined in BotService`
        );

      // Dynamically call the corresponding command handler
      this.bot.onText(
        new RegExp(`/${commandObj.command}`),
        (this.botService as any)[commandObj.command].bind(this.botService)
      );
    }
  }

  public setup(): void {
    // Register bot commands handlers
    this.bot.setMyCommands(BotService.commands);

    // Register bot messages handlers
    this.setupHandlers();
  }
}
