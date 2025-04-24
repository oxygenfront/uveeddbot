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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const telegraf_service_1 = require("./telegraf.service");
const telegram_utils_1 = require("./telegram.utils");
let AppService = class AppService {
    constructor(configService, telegrafService, telegramUtils) {
        this.configService = configService;
        this.telegrafService = telegrafService;
        this.telegramUtils = telegramUtils;
        this.userMessages = new Map();
        const adminChatIdsRaw = this.configService.get("ADMIN_CHAT_IDS");
        try {
            this.adminChatIds = adminChatIdsRaw
                ? JSON.parse(adminChatIdsRaw).map(String)
                : [];
        }
        catch (error) {
            this.adminChatIds = [];
        }
        const ignoredUsersRaw = this.configService.get("EXCEPTIONS_ID");
        try {
            this.ignoredUsers = ignoredUsersRaw
                ? JSON.parse(ignoredUsersRaw).map(String)
                : [];
        }
        catch (error) {
            this.ignoredUsers = [];
        }
    }
    getAdminChatIds() {
        return this.adminChatIds;
    }
    async handleMessage(ctx) {
        const message = ctx.message;
        const username = message.from?.username || "unknown";
        const userId = message.from?.id?.toString();
        const text = message.text || "";
        const chatId = ctx.chat?.id?.toString();
        const messageId = message.message_id?.toString();
        if (!userId || !chatId) {
            return;
        }
        const isIgnoredUser = this.ignoredUsers.includes(userId);
        if (isIgnoredUser) {
            return;
        }
        if (messageId) {
            const messages = this.userMessages.get(userId) || [];
            messages.push({ chatId, messageId });
            this.userMessages.set(userId, messages);
        }
        const chatTitle = ctx.chat?.type !== "private"
            ? ` в чате \`${this.telegramUtils.escapeMarkdown(ctx.chat?.title || "")}\``
            : "";
        const notification = `Новое сообщение от @${this.telegramUtils.escapeMarkdown(username)} ${chatTitle}:\n\`${this.telegramUtils.escapeMarkdown(text)}\``;
        try {
            for (const adminChatId of this.adminChatIds) {
                await this.telegrafService
                    .getBot()
                    .telegram.sendMessage(adminChatId, notification, {
                    parse_mode: "MarkdownV2",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "❌ Заблокировать пользователя",
                                    callback_data: `delete_user_${userId}_from_${chatId}`,
                                },
                            ],
                        ],
                    },
                });
            }
            console.log(this.userMessages);
        }
        catch (error) { }
    }
    getUserMessages(userId, chatId) {
        const messages = this.userMessages.get(userId) || [];
        return messages.filter((msg) => msg.chatId === chatId);
    }
    deleteUserMessages(userId, chatId) {
        const messages = this.userMessages.get(userId) || [];
        this.userMessages.set(userId, messages.filter((msg) => msg.chatId !== chatId));
        if (this.userMessages.get(userId)?.length === 0) {
            this.userMessages.delete(userId);
        }
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        telegraf_service_1.TelegrafService,
        telegram_utils_1.TelegramUtils])
], AppService);
//# sourceMappingURL=app.service.js.map