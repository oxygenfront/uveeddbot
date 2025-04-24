import { Context, Telegraf } from "telegraf";
import { AppService } from "./app.service";
import { TelegramUtils } from "./telegram.utils";
export declare class TelegramUpdate {
    private readonly appService;
    private readonly bot;
    private readonly telegramUtils;
    constructor(appService: AppService, bot: Telegraf, telegramUtils: TelegramUtils);
    onStart(ctx: Context): Promise<void>;
    onText(ctx: Context): Promise<void>;
    onDelete(ctx: Context): Promise<void>;
}
