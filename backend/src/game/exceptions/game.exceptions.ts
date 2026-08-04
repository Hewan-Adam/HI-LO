import { ConflictException, ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';

export class GameNotFoundException extends NotFoundException {
  constructor(gameId: string) {
    super(`Game ${gameId} not found`);
  }
}

export class NotYourGameException extends ForbiddenException {
  constructor() {
    super('This game does not belong to you');
  }
}

export class GameNotActiveException extends ConflictException {
  constructor(gameId: string) {
    super(`Game ${gameId} is not active`);
  }
}

/** The Redis-held live state expired (TTL) or was otherwise lost, but the durable row still shows ACTIVE — the game session is unrecoverable and must be treated as abandoned. */
export class GameSessionExpiredException extends GoneException {
  constructor(gameId: string) {
    super(`The session for game ${gameId} has expired. This game will be settled as abandoned.`);
  }
}
