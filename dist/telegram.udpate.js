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
let TelegramUpdate = class TelegramUpdate {
    constructor(appService, bot) {
        this.appService = appService;
        this.bot = bot;
    }
    async onStart(ctx) {
        await this.appService.onStart(ctx);
    }
    async onDelete(ctx) {
        await this.appService.handleDeleteUser(ctx);
    }
    async onDeleteMessage(ctx) {
        await this.appService.handleDeleteMessage(ctx);
    }
    async handleAddUserToExceptions(ctx) {
        await this.appService.handleAddUserToExceptions(ctx);
    }
    async addUsersToExceptions(ctx) {
        const message = ctx.message;
        const text = message.text;
        const idsString = text.replace(/\/add_users_to_exceptions\s*/, "").trim();
        if (!idsString) {
            await ctx.reply("Пожалуйста, укажите список ID через пробел или новую строку, например: /add_users_to_exceptions 7540580123 7211371377");
            return;
        }
        const arrayIds = idsString
            .split(/\s+/)
            .map((id) => id.trim())
            .filter((id) => id.length > 0 && !isNaN(Number(id)));
        if (arrayIds.length === 0) {
            await ctx.reply("Не удалось распознать ID. Укажите корректные числовые значения.");
            return;
        }
        await this.appService.handleAddUsersToExceptions(ctx, arrayIds);
    }
    async onMessage(ctx) {
        if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
            await this.appService.handleMessage(ctx);
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
    (0, nestjs_telegraf_1.Action)(/^delete_user_(\d+)_from_(-?\d+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "onDelete", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^delete_message_(\d+)_from_(\d+)_in_(-?\d+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "onDeleteMessage", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^add_user_(\d+)_to_exceptions/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "handleAddUserToExceptions", null);
__decorate([
    (0, nestjs_telegraf_1.Command)(/^add_users_to_exceptions/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "addUsersToExceptions", null);
__decorate([
    (0, nestjs_telegraf_1.On)("message"),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramUpdate.prototype, "onMessage", null);
exports.TelegramUpdate = TelegramUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    __param(1, (0, nestjs_telegraf_1.InjectBot)()),
    __metadata("design:paramtypes", [app_service_1.AppService,
        telegraf_1.Telegraf])
], TelegramUpdate);
//# sourceMappingURL=telegram.udpate.js.map