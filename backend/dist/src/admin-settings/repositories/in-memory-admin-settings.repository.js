"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAdminSettingsRepository = void 0;
const common_1 = require("@nestjs/common");
let InMemoryAdminSettingsRepository = class InMemoryAdminSettingsRepository {
    constructor() {
        this.settings = new Map();
    }
    async get(key) {
        const record = this.settings.get(key);
        return record ? { ...record } : null;
    }
    async set(key, value, updatedBy, description) {
        const existing = this.settings.get(key);
        const record = {
            key,
            value,
            description: description ?? existing?.description,
            updatedBy,
            updatedAt: new Date(),
        };
        this.settings.set(key, record);
        return { ...record };
    }
    async getAll() {
        return [...this.settings.values()].sort((a, b) => a.key.localeCompare(b.key));
    }
};
exports.InMemoryAdminSettingsRepository = InMemoryAdminSettingsRepository;
exports.InMemoryAdminSettingsRepository = InMemoryAdminSettingsRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryAdminSettingsRepository);
