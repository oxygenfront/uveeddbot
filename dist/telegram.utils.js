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
exports.TelegramUtils = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const canvas_1 = require("canvas");
const nestjs_prisma_1 = require("nestjs-prisma");
const sharp = require("sharp");
let TelegramUtils = class TelegramUtils {
    constructor(prisma) {
        this.prisma = prisma;
    }
    escapeMarkdown(text) {
        return text.replace(/([[\]()>#+_\-=|{}.!%\\])/g, "\\$1");
    }
    getUsername(ctx) {
        if ("callback_query" in ctx.update) {
            return ctx.update.callback_query.from.username || "unknown";
        }
        else {
            return ctx.update["message"].from.username || "unknown";
        }
    }
    getFirstName(ctx) {
        if ("message" in ctx.update) {
            return ctx.update.message.from.first_name || "unknown";
        }
        else {
            return ctx.update["message"].from.first_name || "unknown";
        }
    }
    async generateScreenshot(ctx) {
        const message = ctx.message;
        const userId = message.from?.id;
        const firstName = this.getFirstName(ctx);
        const chat = await ctx.telegram.getChat(ctx.chat?.id || 0);
        const chatName = chat["title"] || "Unknown Chat";
        const isPrivate = ctx.chat?.type === "private";
        const chatStatus = isPrivate ? "Приватный Чат" : "Группа";
        const hasPhoto = message.photo?.length > 0;
        const hasSticker = !!message.sticker;
        const hasAudio = !!message.audio;
        const hasVoice = !!message.voice;
        const hasAnimation = !!message.animation;
        let contentToDisplay = message.text || "Без текста";
        const maxTextWidth = 280;
        const lineHeight = 22;
        let lines = [];
        let bubbleHeight = 60;
        let bubbleWidth = 0;
        if (hasPhoto || hasSticker || hasAnimation) {
            bubbleHeight = 200;
            bubbleWidth = 300;
        }
        else if (hasAudio || hasVoice) {
            bubbleHeight = 60;
            bubbleWidth = 300;
            contentToDisplay = hasAudio
                ? `${message.audio.title || "🎧 Аудио"}`
                : "🎧 Голосовое сообщение";
            lines = this.wrapText(contentToDisplay, maxTextWidth);
            bubbleHeight += lines.length * lineHeight;
        }
        else {
            lines = this.wrapText(contentToDisplay, maxTextWidth);
            bubbleHeight += lines.length * lineHeight;
            bubbleWidth =
                Math.max(...lines.map((line) => this.measureTextWidth(line)), this.measureTextWidth(firstName)) + 40;
        }
        const canvasWidth = Math.max(400, bubbleWidth + 140);
        const canvasHeight = 110 + bubbleHeight + 60;
        const canvas = (0, canvas_1.createCanvas)(canvasWidth, canvasHeight);
        const ctxCanvas = canvas.getContext("2d");
        const gradient = ctxCanvas.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, "#0f1419");
        gradient.addColorStop(1, "#1e2a3d");
        ctxCanvas.fillStyle = gradient;
        ctxCanvas.fillRect(0, 0, canvasWidth, canvasHeight);
        ctxCanvas.fillStyle = "#444";
        ctxCanvas.beginPath();
        ctxCanvas.arc(40, 40, 30, 0, Math.PI * 2);
        ctxCanvas.fill();
        ctxCanvas.closePath();
        try {
            if (chat.photo) {
                const file = await ctx.telegram.getFile(chat.photo.small_file_id);
                const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
                const image = await (0, canvas_1.loadImage)(imageUrl);
                ctxCanvas.save();
                ctxCanvas.beginPath();
                ctxCanvas.arc(40, 40, 30, 0, Math.PI * 2);
                ctxCanvas.clip();
                ctxCanvas.drawImage(image, 10, 10, 60, 60);
                ctxCanvas.restore();
            }
        }
        catch (error) {
            console.error("Error loading chat avatar:", error.message);
        }
        ctxCanvas.fillStyle = "#FF0000";
        ctxCanvas.font = "20px Arial";
        ctxCanvas.fillText(chatName, 80, 50);
        ctxCanvas.fillStyle = "#b0b0b0";
        ctxCanvas.font = "20px Arial";
        ctxCanvas.fillText(`• ${chatStatus}`, 80 + ctxCanvas.measureText(chatName).width + 7, 50);
        const avatarTop = 130;
        const avatarLeft = 40;
        const bubbleLeft = 100;
        const bubbleTop = avatarTop - 30;
        try {
            const userPhotos = await ctx.telegram.getUserProfilePhotos(userId);
            if (userPhotos.total_count > 0) {
                const photo = userPhotos.photos[0][0];
                const file = await ctx.telegram.getFile(photo.file_id);
                const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
                const image = await (0, canvas_1.loadImage)(imageUrl);
                ctxCanvas.save();
                ctxCanvas.beginPath();
                ctxCanvas.arc(avatarLeft, avatarTop, 30, 0, Math.PI * 2);
                ctxCanvas.clip();
                ctxCanvas.drawImage(image, avatarLeft - 30, avatarTop - 30, 60, 60);
                ctxCanvas.restore();
            }
            else {
                ctxCanvas.fillStyle = "#444";
                ctxCanvas.beginPath();
                ctxCanvas.arc(avatarLeft, avatarTop, 30, 0, Math.PI * 2);
                ctxCanvas.fill();
            }
        }
        catch (error) {
            console.error("Error loading user avatar:", error.message);
        }
        ctxCanvas.fillStyle = "#2f2f2f";
        ctxCanvas.beginPath();
        ctxCanvas.moveTo(bubbleLeft, bubbleTop);
        ctxCanvas.lineTo(bubbleLeft + bubbleWidth, bubbleTop);
        ctxCanvas.quadraticCurveTo(bubbleLeft + bubbleWidth + 20, bubbleTop, bubbleLeft + bubbleWidth + 20, bubbleTop + 20);
        ctxCanvas.lineTo(bubbleLeft + bubbleWidth + 20, bubbleTop + bubbleHeight - 20);
        ctxCanvas.quadraticCurveTo(bubbleLeft + bubbleWidth + 20, bubbleTop + bubbleHeight, bubbleLeft + bubbleWidth, bubbleTop + bubbleHeight);
        ctxCanvas.lineTo(bubbleLeft, bubbleTop + bubbleHeight);
        ctxCanvas.quadraticCurveTo(bubbleLeft - 20, bubbleTop + bubbleHeight, bubbleLeft - 20, bubbleTop + bubbleHeight - 20);
        ctxCanvas.lineTo(bubbleLeft - 20, bubbleTop + 20);
        ctxCanvas.quadraticCurveTo(bubbleLeft - 20, bubbleTop, bubbleLeft, bubbleTop);
        ctxCanvas.closePath();
        ctxCanvas.fill();
        if (hasPhoto) {
            try {
                const photo = message.photo[message.photo.length - 1];
                const file = await ctx.telegram.getFile(photo.file_id);
                const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
                const response = await axios_1.default.get(imageUrl, {
                    responseType: "arraybuffer",
                });
                const imageBuffer = Buffer.from(response.data);
                const { width, height } = await sharp(imageBuffer).metadata();
                const aspectRatio = width / height;
                const displayHeight = bubbleHeight - 40;
                const displayWidth = displayHeight * aspectRatio;
                const image = await (0, canvas_1.loadImage)(imageBuffer);
                ctxCanvas.drawImage(image, bubbleLeft + 10, bubbleTop + 20, Math.min(displayWidth, bubbleWidth - 40), displayHeight);
            }
            catch (error) {
                console.error("Error loading photo:", error.message);
                ctxCanvas.fillStyle = "#fff";
                ctxCanvas.fillText("Ошибка загрузки изображения", bubbleLeft + 10, bubbleTop + 40);
            }
        }
        else if (hasSticker) {
            try {
                const file = await ctx.telegram.getFile(message.sticker.file_id);
                const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
                const response = await axios_1.default.get(imageUrl, {
                    responseType: "arraybuffer",
                });
                const webpBuffer = Buffer.from(response.data);
                const pngBuffer = await sharp(webpBuffer).png().toBuffer();
                const { width, height } = await sharp(pngBuffer).metadata();
                const aspectRatio = width / height;
                const displayHeight = bubbleHeight - 40;
                const displayWidth = displayHeight * aspectRatio;
                const image = await (0, canvas_1.loadImage)(pngBuffer);
                ctxCanvas.drawImage(image, bubbleLeft + 10, bubbleTop + 20, Math.min(displayWidth, bubbleWidth - 40), displayHeight);
            }
            catch (error) {
                console.error("Error loading sticker:", error.message);
                ctxCanvas.fillStyle = "#fff";
                ctxCanvas.fillText("Ошибка загрузки стикера", bubbleLeft + 10, bubbleTop + 40);
            }
        }
        else if (hasAnimation) {
            try {
                const file = await ctx.telegram.getFile(message.animation.file_id);
                const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
                const response = await axios_1.default.get(imageUrl, {
                    responseType: "arraybuffer",
                });
                const imageBuffer = Buffer.from(response.data);
                const { width, height } = await sharp(imageBuffer).metadata();
                const aspectRatio = width / height;
                const displayHeight = bubbleHeight - 40;
                const displayWidth = displayHeight * aspectRatio;
                const image = await (0, canvas_1.loadImage)(imageBuffer);
                ctxCanvas.drawImage(image, bubbleLeft + 10, bubbleTop + 20, Math.min(displayWidth, bubbleWidth - 40), displayHeight);
            }
            catch (error) {
                console.error("Error loading animation:", error.message);
                ctxCanvas.fillStyle = "#fff";
                ctxCanvas.fillText("Ошибка загрузки анимации", bubbleLeft + 10, bubbleTop + 40);
            }
        }
        else if (hasAudio || hasVoice) {
            ctxCanvas.fillStyle = "#fff";
            ctxCanvas.font = "14px Arial";
            lines.forEach((line, i) => {
                ctxCanvas.fillText(line, bubbleLeft + 10, bubbleTop + 40 + i * lineHeight);
            });
        }
        else {
            ctxCanvas.fillStyle = "#fff";
            ctxCanvas.font = "14px Arial";
            lines.forEach((line, i) => {
                ctxCanvas.fillText(line, bubbleLeft - 10, bubbleTop + 55 + i * lineHeight);
            });
        }
        ctxCanvas.fillStyle = "#f58025";
        ctxCanvas.font = "bold 15px Arial";
        ctxCanvas.fillText(firstName, bubbleLeft - 10, bubbleTop + 30);
        const timestamp = message.date
            ? new Date(message.date * 1000).toLocaleTimeString()
            : "21:00";
        ctxCanvas.fillStyle = "#888";
        ctxCanvas.font = "12px Arial";
        ctxCanvas.fillText(timestamp, bubbleLeft + bubbleWidth - ctxCanvas.measureText(timestamp).width + 10, bubbleTop + bubbleHeight - 13);
        return canvas.toBuffer();
    }
    measureTextWidth(text) {
        const ctx = (0, canvas_1.createCanvas)(1, 1).getContext("2d");
        ctx.font = "16px Arial";
        return ctx.measureText(text).width;
    }
    wrapText(text, maxWidth) {
        const paragraphs = text.split("\n");
        const lines = [];
        for (const paragraph of paragraphs) {
            const words = paragraph.split(" ");
            let currentLine = words[0] || "";
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = this.measureTextWidth(currentLine + " " + word);
                if (width < maxWidth) {
                    currentLine += " " + word;
                }
                else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);
        }
        return lines;
    }
};
exports.TelegramUtils = TelegramUtils;
exports.TelegramUtils = TelegramUtils = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nestjs_prisma_1.PrismaService])
], TelegramUtils);
//# sourceMappingURL=telegram.utils.js.map