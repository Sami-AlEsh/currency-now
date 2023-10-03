import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { Log } from "./Log";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  username: string;

  @Column()
  telegramId: number;

  @Column()
  languageCode: string;

  @Column({ type: "boolean", default: false })
  isBlocked: boolean;

  @CreateDateColumn({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
  })
  JoinedAt: Date;

  @OneToMany((type) => Log, (log) => log.user)
  logs: Log[];
}
