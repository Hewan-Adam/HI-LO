"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientAdminPrivilegeException = exports.AdminUserNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class AdminUserNotFoundException extends common_1.NotFoundException {
    constructor(userId) {
        super(`User ${userId} not found`);
    }
}
exports.AdminUserNotFoundException = AdminUserNotFoundException;
class InsufficientAdminPrivilegeException extends common_1.ForbiddenException {
    constructor(action) {
        super(`You do not have sufficient privilege to ${action}`);
    }
}
exports.InsufficientAdminPrivilegeException = InsufficientAdminPrivilegeException;
