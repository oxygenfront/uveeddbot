import { OnModuleInit } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { Context, Telegraf } from "telegraf";
import { TelegrafService } from "./telegraf.service";
import { TelegramUtils } from "./telegram.utils";
export declare class AppService implements OnModuleInit {
    private readonly prisma;
    private readonly bot;
    private readonly telegrafService;
    private readonly telegramUtils;
    private ignoredUsers;
    private adminChatIds;
    private readonly userMessages;
    constructor(prisma: PrismaService, bot: Telegraf, telegrafService: TelegrafService, telegramUtils: TelegramUtils);
    onModuleInit(): Promise<void>;
    onStart(ctx: Context): Promise<import("@telegraf/types").Message.TextMessage | undefined>;
    handleAddUsersToExceptions(ctx: Context, arrayIds: string[]): Promise<void>;
    handleDeleteUsersFromExceptions(ctx: Context, arrayIds: string[]): Promise<void>;
    handleMessage(ctx: Context): Promise<void>;
    handleDeleteUser(ctx: Context): Promise<void>;
    handleDeleteMessage(ctx: Context): Promise<void>;
    handleAddUserToExceptions(ctx: Context): Promise<void>;
    getUserMessages(userId: number, chatId: number): {
        chatId: number;
        messageId: number;
    }[];
    deleteUserMessage(userId: number, messageId: number): void;
    deleteUserMessages(userId: number, chatId: number): void;
    private handleNewChatMember;
    private storeUserMessage;
    private getMessageType;
    private createNotification;
    private notifyAdmins;
    private notifyAdminsWithMessage;
    private deleteMessagesInBatches;
    private handleError;
}
