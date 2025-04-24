"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramUtils = void 0;
const common_1 = require("@nestjs/common");
let TelegramUtils = class TelegramUtils {
    escapeMarkdown(text) {
        return text.replace(/([[\]()>#+_\-=|{}.!%\\])/g, "\\$1");
    }
};
exports.TelegramUtils = TelegramUtils;
exports.TelegramUtils = TelegramUtils = __decorate([
    (0, common_1.Injectable)()
], TelegramUtils);
//# sourceMappingURL=telegram.utils.js.map