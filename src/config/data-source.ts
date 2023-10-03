import { Log } from "../entities/Log";
import { User } from "../entities/User";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./database.sqlite",
  synchronize: true,
  logging: false,
  entities: [User, Log],
});
