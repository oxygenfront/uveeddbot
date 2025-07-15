"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_prisma_1 = require("nestjs-prisma");
const nestjs_telegraf_1 = require("nestjs-telegraf");
const telegraf_1 = require("telegraf");
const telegraf_service_1 = require("./telegraf.service");
const telegram_utils_1 = require("./telegram.utils");
const CALLBACK_PATTERNS = {
    DELETE_USER: "delete_user_",
    DELETE_MESSAGE: "delete_message_",
    ADD_TO_EXCEPTIONS: "add_user_",
};
let AppService = class AppService {
    constructor(prisma, bot, telegrafService, telegramUtils) {
        this.prisma = prisma;
        this.bot = bot;
        this.telegrafService = telegrafService;
        this.telegramUtils = telegramUtils;
        this.ignoredUsers = [];
        this.adminChatIds = [];
        this.userMessages = new Map();
    }
    async onModuleInit() {
        try {
            const [adminChatIds, exceptionsIds] = await Promise.all([
                this.prisma.adminIds.findMany(),
                this.prisma.exceptionIds.findMany(),
            ]);
            this.adminChatIds = adminChatIds.map((e) => e.id);
            this.ignoredUsers = exceptionsIds.map((e) => e.id);
        }
        catch (error) {
            console.error("Ошибка при инициализации данных из Prisma:", error);
        }
    }
    async onStart(ctx) {
        return ctx.reply("Меню администратора", {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "➕ Добавить исключения",
                            callback_data: "add_users_to_exceptions",
                        },
                    ],
                    [
                        {
                            text: "🗑️ Удалить исключения",
                            callback_data: "remove_users_from_exceptions",
                        },
                    ],
                ],
            },
        });
    }
    async handleAddUsersToExceptions(ctx, arrayIds) {
        const userIds = arrayIds
            .map((id) => BigInt(id.trim()))
            .filter((id) => !isNaN(Number(id)) && id >= 0n);
        if (userIds.length === 0) {
            await ctx.reply("Нет корректных ID для добавления.");
            return;
        }
        try {
            await this.prisma.$transaction(async (prisma) => {
                const existingIds = await prisma.exceptionIds.findMany({
                    where: {
                        id: { in: userIds.map((id) => id) },
                    },
                    select: { id: true },
                });
                const existingIdSet = new Set(existingIds.map((e) => e.id.toString()));
                const newIds = userIds.filter((id) => !existingIdSet.has(id.toString()));
                if (newIds.length === 0) {
                    await ctx.reply("Все указанные ID уже существуют в исключениях.");
                    return;
                }
                if (newIds.length > 0) {
                    const batchSize = 1000;
                    for (let i = 0; i < newIds.length; i += batchSize) {
                        const batch = newIds.slice(i, i + batchSize);
                        await prisma.exceptionIds.createMany({
                            data: batch.map((id) => ({ id })),
                            skipDuplicates: true,
                        });
                    }
                    this.ignoredUsers.push(...newIds.map((id) => id));
                }
                await ctx.reply(`Успешно добавлены пользователи с ID: ${newIds.map((id) => id.toString()).join(", ")} в исключения.`);
            });
        }
        catch (error) {
            console.error("Ошибка при добавлении пользователей в исключениях:", error);
            await ctx.reply("Произошла ошибка при добавлении пользователей в исключения.");
        }
    }
    async handleRemoveUsersFromExceptions(ctx) { }
    async handleMessage(ctx) {
        const message = ctx.message;
        const userId = message.from?.id;
        const chatId = ctx.chat?.id;
        const messageId = message.message_id;
        if (!userId || !chatId)
            return;
        if (message.new_chat_member) {
            await this.handleNewChatMember(ctx, userId, chatId);
            return;
        }
        if (this.ignoredUsers.includes(userId))
            return;
        if (messageId) {
            this.storeUserMessage(userId, chatId, messageId);
        }
        const messageType = this.getMessageType(message);
        const notification = this.createNotification(ctx, messageType);
        await this.notifyAdmins(ctx, chatId, messageId, userId, notification);
    }
    async handleDeleteUser(ctx) {
        const telegram = this.telegrafService.getBot().telegram;
        if (!("match" in ctx && ctx.match)) {
            await ctx.answerCbQuery("Ошибка: неверный формат callback_data", {
                show_alert: true,
            });
            return;
        }
        const userId = Number(ctx.match[1]);
        const chatId = Number(ctx.match[2]);
        const username = this.telegramUtils.getUsername(ctx);
        const botId = this.bot.botInfo?.id;
        try {
            const botMember = await telegram.getChatMember(chatId, botId);
            if (!botMember["can_restrict_members"]) {
                await ctx.answerCbQuery("Бот не имеет прав для удаления пользователей", {
                    show_alert: true,
                });
                return;
            }
            const userMessages = this.getUserMessages(userId, chatId);
            await this.deleteMessagesInBatches(telegram, chatId, userMessages);
            this.deleteUserMessages(userId, chatId);
            await telegram.banChatMember(chatId, userId);
            await ctx.answerCbQuery("Пользователь успешно удален", {
                show_alert: false,
            });
            const adminNotification = `Пользователь с ID ${userId} удален из чата пользователем @${this.telegramUtils.escapeMarkdown(username)}`;
            await this.notifyAdminsWithMessage(adminNotification);
        }
        catch (error) {
            await this.handleError(ctx, error, "Ошибка при удалении пользователя");
        }
    }
    async handleDeleteMessage(ctx) {
        const telegram = this.telegrafService.getBot().telegram;
        if (!("match" in ctx && ctx.match)) {
            await ctx.answerCbQuery("Ошибка: неверный формат callback_data", {
                show_alert: true,
            });
            return;
        }
        const messageId = Number(ctx.match[1]);
        const userId = Number(ctx.match[2]);
        const chatId = Number(ctx.match[3]);
        const username = this.telegramUtils.getUsername(ctx);
        const botId = this.bot.botInfo?.id;
        try {
            const botMember = await telegram.getChatMember(chatId, botId);
            if (!botMember["can_delete_messages"]) {
                await ctx.answerCbQuery("Бот не имеет прав для удаления сообщений", {
                    show_alert: true,
                });
                return;
            }
            this.deleteUserMessage(userId, messageId);
            await telegram.deleteMessage(chatId, messageId);
            await ctx.answerCbQuery("Сообщение успешно удалено", {
                show_alert: false,
            });
            const adminNotification = `Сообщение с ID \`${this.telegramUtils.escapeMarkdown(String(messageId))}\` удалено из чата \`${this.telegramUtils.escapeMarkdown(String(chatId))}\` администратором @${this.telegramUtils.escapeMarkdown(username)}`;
            await this.notifyAdminsWithMessage(adminNotification);
        }
        catch (error) {
            await this.handleError(ctx, error, "Ошибка при удалении сообщения");
        }
    }
    async handleAddUserToExceptions(ctx) {
        if (!("match" in ctx && ctx.match)) {
            await ctx.answerCbQuery("Ошибка: неверный формат callback_data", {
                show_alert: true,
            });
            return;
        }
        const userId = BigInt(ctx.match[1]);
        const username = this.telegramUtils.getUsername(ctx);
        try {
            await this.prisma.exceptionIds.create({
                data: { id: userId },
            });
            this.ignoredUsers.push(userId);
            await ctx.answerCbQuery("Пользователь добавлен в исключения", {
                show_alert: false,
            });
            const adminNotification = `Пользователь @${this.telegramUtils.escapeMarkdown(username)} (ID: ${userId}) добавлен в исключения в чате ${ctx.chat && ctx.chat["title"]}`;
            await this.notifyAdminsWithMessage(adminNotification);
        }
        catch (error) {
            await this.handleError(ctx, error, "Ошибка при добавлении пользователя в исключения");
        }
    }
    getUserMessages(userId, chatId) {
        return (this.userMessages.get(userId) || []).filter((msg) => msg.chatId === chatId);
    }
    deleteUserMessage(userId, messageId) {
        const messages = this.userMessages.get(userId);
        if (!messages)
            return;
        const index = messages.findIndex((msg) => msg.messageId === messageId);
        if (index === -1)
            return;
        messages.splice(index, 1);
        if (messages.length === 0) {
            this.userMessages.delete(userId);
        }
        else {
            this.userMessages.set(userId, messages);
        }
    }
    deleteUserMessages(userId, chatId) {
        const messages = this.userMessages.get(userId) || [];
        this.userMessages.set(userId, messages.filter((msg) => msg.chatId !== chatId));
        if (this.userMessages.get(userId)?.length === 0) {
            this.userMessages.delete(userId);
        }
    }
    async handleNewChatMember(ctx, userId, chatId) {
        if (this.ignoredUsers.includes(userId)) {
            try {
                await ctx.telegram.banChatMember(chatId, Number(userId));
            }
            catch (error) {
                console.error(`Ошибка при бане пользователя ${userId} в чате ${chatId}:`, error);
            }
            return;
        }
        try {
            const chatMember = await ctx.telegram.getChatMember(chatId, Number(userId));
            if (chatMember.status === "kicked") {
                await ctx.telegram.banChatMember(chatId, Number(userId));
            }
        }
        catch (error) {
            console.error(`Ошибка при проверке статуса пользователя ${userId} в чате ${chatId}:`, error);
        }
    }
    storeUserMessage(userId, chatId, messageId) {
        const messages = this.userMessages.get(userId) || [];
        messages.push({ chatId, messageId });
        this.userMessages.set(userId, messages);
    }
    getMessageType(message) {
        if (message.text)
            return "текстовое сообщение";
        if (message.photo)
            return "фото";
        if (message.video)
            return "видео";
        if (message.sticker)
            return "стикер";
        if (message.voice)
            return "голосовое сообщение";
        if (message.document)
            return "документ";
        if (message.animation)
            return "гиф";
        if (message.audio)
            return "аудио";
        return "сообщение";
    }
    createNotification(ctx, messageType) {
        const username = this.telegramUtils.getUsername(ctx);
        const chatTitle = ctx.chat?.type !== "private"
            ? ` в чате \`${this.telegramUtils.escapeMarkdown(ctx.chat?.title || "")}\``
            : "";
        return `Новое ${messageType} от @${this.telegramUtils.escapeMarkdown(username)}${chatTitle}`;
    }
    async notifyAdmins(ctx, chatId, messageId, userId, messageType) {
        const telegram = this.telegrafService.getBot().telegram;
        const screenshot = await this.telegramUtils.generateScreenshot(ctx);
        const message = ctx.message;
        const username = this.telegramUtils.getUsername(ctx);
        for (const adminChatId of this.adminChatIds) {
            try {
                const photoMessage = await telegram.sendPhoto(Number(adminChatId), { source: screenshot }, {
                    caption: `★ Чат: \`${this.telegramUtils.escapeMarkdown((ctx.chat && ctx.chat["title"]) || "Unknown Chat")}\`\n★ Сообщение от: @${this.telegramUtils.escapeMarkdown(username)}`,
                    parse_mode: "MarkdownV2",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🗑️ Удалить сообщение",
                                    callback_data: `${CALLBACK_PATTERNS.DELETE_MESSAGE}${messageId}_from_${userId}_in_${chatId}`,
                                },
                            ],
                            [
                                {
                                    text: "❌ Заблокировать пользователя",
                                    callback_data: `${CALLBACK_PATTERNS.DELETE_USER}${userId}_from_${chatId}`,
                                },
                            ],
                            [
                                {
                                    text: "➕ Добавить пользователя в исключения",
                                    callback_data: `${CALLBACK_PATTERNS.ADD_TO_EXCEPTIONS}${userId}`,
                                },
                            ],
                        ],
                    },
                });
                if (message.voice) {
                    await telegram.sendVoice(Number(adminChatId), message.voice.file_id, {
                        caption: `Голосовое сообщение от @${this.telegramUtils.escapeMarkdown(username)}`,
                        reply_parameters: { message_id: photoMessage.message_id },
                    });
                }
                else if (message.audio) {
                    await telegram.sendAudio(Number(adminChatId), message.audio.file_id, {
                        caption: `Аудио от @${this.telegramUtils.escapeMarkdown(username)}`,
                        reply_parameters: { message_id: photoMessage.message_id },
                    });
                }
                else if (message.document) {
                    await telegram.sendDocument(Number(adminChatId), message.document.file_id, {
                        caption: `Документ от @${this.telegramUtils.escapeMarkdown(username)}`,
                        reply_parameters: { message_id: photoMessage.message_id },
                    });
                }
            }
            catch (error) {
                console.log("notifyAdmins");
                console.warn(`Не удалось отправить уведомление в ${adminChatId}: ${error.message}`);
            }
        }
    }
    async notifyAdminsWithMessage(notification) {
        const telegram = this.telegrafService.getBot().telegram;
        for (const adminChatId of this.adminChatIds) {
            try {
                await telegram.sendMessage(Number(adminChatId), this.telegramUtils.escapeMarkdown(notification), {
                    parse_mode: "MarkdownV2",
                });
            }
            catch (error) {
                console.log("notifyAdminsWithMessage");
                console.warn(`Не удалось отправить уведомление в ${adminChatId}: ${error.message}`);
            }
        }
    }
    async deleteMessagesInBatches(telegram, chatId, messages) {
        const BATCH_SIZE = 10;
        const batches = [];
        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            batches.push(messages.slice(i, i + BATCH_SIZE));
        }
        for (const batch of batches) {
            const deletePromises = batch.map(async (message) => {
                try {
                    await telegram.deleteMessage(chatId, message.messageId);
                }
                catch (error) {
                    console.warn(`Не удалось удалить сообщение ${message.messageId}: ${error.message}`);
                }
            });
            await Promise.all(deletePromises);
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    async handleError(ctx, error, defaultMessage) {
        console.error(`${defaultMessage}:`, error);
        await ctx.answerCbQuery(`Ошибка: ${error.message}`, { show_alert: true });
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, nestjs_telegraf_1.InjectBot)()),
    __metadata("design:paramtypes", [nestjs_prisma_1.PrismaService,
        telegraf_1.Telegraf,
        telegraf_service_1.TelegrafService,
        telegram_utils_1.TelegramUtils])
], AppService);
//# sourceMappingURL=app.service.js.map