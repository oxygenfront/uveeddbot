import { Context } from "telegraf";
export declare class TelegramUtils {
    escapeMarkdown(text: string): string;
    measureTextWidth(text: string): number;
    getUsername(ctx: Context): string;
    getFirstName(ctx: Context): string;
    generateScreenshot(ctx: Context): Promise<Buffer>;
    private wrapText;
}
