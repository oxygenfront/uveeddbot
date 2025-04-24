import { ConfigService } from "@nestjs/config";
import { Context } from "telegraf";
import { TelegrafService } from "./telegraf.service";
import { TelegramUtils } from "./telegram.utils";
export declare class AppService {
    private readonly configService;
    private readonly telegrafService;
    private readonly telegramUtils;
    private readonly ignoredUsers;
    private readonly adminChatIds;
    private readonly userMessages;
    constructor(configService: ConfigService, telegrafService: TelegrafService, telegramUtils: TelegramUtils);
    getAdminChatIds(): string[];
    handleMessage(ctx: Context): Promise<void>;
    getUserMessages(userId: string, chatId: string): {
        chatId: string;
        messageId: string;
    }[];
    deleteUserMessages(userId: string, chatId: string): void;
}
