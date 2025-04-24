import { OnModuleInit } from "@nestjs/common";
import { Telegraf } from "telegraf";
export declare class TelegrafService implements OnModuleInit {
    private readonly bot;
    private readonly logger;
    constructor(bot: Telegraf);
    onModuleInit(): Promise<void>;
    getBot(): Telegraf;
}
