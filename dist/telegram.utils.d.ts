import { PrismaService } from "nestjs-prisma";
import { Context } from "telegraf";
export declare class TelegramUtils {
    private readonly prisma;
    constructor(prisma: PrismaService);
    escapeMarkdown(text: string): string;
    getUsername(ctx: Context): string;
    getFirstName(ctx: Context): string;
    generateScreenshot(ctx: Context): Promise<Buffer>;
    measureTextWidth(text: string): number;
    private wrapText;
}
