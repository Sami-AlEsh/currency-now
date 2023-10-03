import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import { User } from "./User";

@Entity()
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  command: string;

  @ManyToOne((type) => User, (user) => user.logs)
  user: User;

  @CreateDateColumn({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
  })
  executedAt: Date;
}
