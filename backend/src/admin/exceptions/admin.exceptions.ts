import { ForbiddenException, NotFoundException } from '@nestjs/common';

export class AdminUserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`User ${userId} not found`);
  }
}

export class InsufficientAdminPrivilegeException extends ForbiddenException {
  constructor(action: string) {
    super(`You do not have sufficient privilege to ${action}`);
  }
}
