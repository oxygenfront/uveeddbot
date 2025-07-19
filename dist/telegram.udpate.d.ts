import { Context, Telegraf } from "telegraf";
import { AppService } from "./app.service";
export declare class TelegramUpdate {
    private readonly appService;
    private readonly bot;
    constructor(appService: AppService, bot: Telegraf<Context>);
    onStart(ctx: Context): Promise<void>;
    onDelete(ctx: Context): Promise<void>;
    onDeleteMessage(ctx: Context): Promise<void>;
    handleAddUserToExceptions(ctx: Context): Promise<void>;
    addUsersToExceptions(ctx: Context): Promise<void>;
    handleDeleteUserFromExceptions(ctx: Context): Promise<void>;
    onMessage(ctx: Context): Promise<void>;
}
