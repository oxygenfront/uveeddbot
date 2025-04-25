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
exports.TelegramUpdate = void 0;
const nestjs_telegraf_1 = require("nestjs-telegraf");
const telegraf_1 = require("telegraf");
const app_service_1 = require("./app.service");
const telegram_utils_1 = require("./telegram.utils");
let TelegramUpdate = class TelegramUpdate {
    constructor(appService, bot, telegramUtils) {
        this.appService = appService;
        this.bot = bot;
        this.telegramUtils = telegramUtils;
    }
    async onStart(ctx) {
        await ctx.reply("Привет");
    }
    async onText(ctx) {
        if (ctx.chat &&
            (ctx.chat.type === "group" || ctx.chat.type === "supergroup")) {
            await this.appService.handleMessage(ctx);
        }
    }
    async onDelete(ctx) {
        if (!(this.bot && this.bot.botInfo)) {
            await ctx.answerCbQuery("Ошибка: бот не инициализирован", {
                show_alert: true,
            });
            return;
        }
        if (!("match" in ctx && ctx.match)) {
            await ctx.answerCbQuery("Ошибка: неверный формат callback_data", {
                show_alert: true,
            });
            return;
        }
        const username = ("callback_query" in ctx.update &&
            ctx.update.callback_query.from.username) ||
            "unknown";
        const userId = ctx.match[1];
        const chatId = ctx.match[2];
        const admId = ("callback_query" in ctx.update && ctx.update.callback_query.from.id) ||
            0;
        try {
            const botMember = await ctx.telegram.getChatMember(chatId, this.bot.botInfo.id);
            const botAdmin = botMember;
            if (!botAdmin.can_restrict_members) {
                await ctx.answerCbQuery("Бот не имеет прав для удаления пользователей", {
                    show_alert: true,
                });
                return;
            }
            const userMessages = this.appService.getUserMessages(userId, chatId);
            const BATCH_SIZE = 10;
            const batches = [];
            for (let i = 0; i < userMessages.length; i += BATCH_SIZE) {
                batches.push(userMessages.slice(i, i + BATCH_SIZE));
            }
            for (const batch of batches) {
                const deletePromises = batch.map(async (message) => {
                    try {
                        await ctx.telegram.deleteMessage(chatId, Number(message.messageId));
                        console.log(`Удалено сообщение ${message.messageId} от пользователя ${userId}`);
                    }
                    catch (error) {
                        console.warn(`Не удалось удалить сообщение ${message.messageId}: ${error.message}`);
                    }
                });
                await Promise.all(deletePromises);
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            this.appService.deleteUserMessages(userId, chatId);
            await ctx.telegram.banChatMember(chatId, Number(userId));
            console.log(`Пользователь ${userId} удален из группы ${chatId}`);
            await ctx.answerCbQuery("Пользователь успешно удален", {
                show_alert: false,
            });
            const adminNotification = `Пользователь с ID ${userId} удален из чата пользователем @${this.telegramUtils.escapeMarkdown(username)}`;
            for (const adminChatId of this.appService.getAdminChatIds()) {
                await ctx.telegram.sendMessage(adminChatId, adminNotification, {
                    parse_mode: "MarkdownV2",
                });
                console.log(`Уведомление отправлено в ${adminChatId}`);
            }
        }
        catch (error) {
            console.error("Ошибка при удалении пользователя или сообщений:", error);
            await ctx.answerCbQuery(`Ошибка: ${error.message}`, { show_alert: true });
        }
    }
};
exports.TelegramUpdate = TelegramUpdate;
__decorate([
    (0, nestjs_telegraf_1.Start)(),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "onStart", null);
__decorate([
    (0, nestjs_telegraf_1.On)("text"),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "onText", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^delete_user_(\d+)_from_(-?\d+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "onDelete", null);
exports.TelegramUpdate = TelegramUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    __param(1, (0, nestjs_telegraf_1.InjectBot)()),
    __metadata("design:paramtypes", [app_service_1.AppService,
        telegraf_1.Telegraf,
        telegram_utils_1.TelegramUtils])
], TelegramUpdate);
//# sourceMappingURL=telegram.udpate.js.map