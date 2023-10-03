import "reflect-metadata";
import { config } from "dotenv";

import { Bot } from "./Bot";
import { AppDataSource } from "./config/data-source";

config();

AppDataSource.initialize()
  .then(() => {
    const bot = new Bot();
    bot.setup();
  })
  .catch((error) => console.log(error));
