"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSessionExpiredException = exports.GameNotActiveException = exports.NotYourGameException = exports.GameNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class GameNotFoundException extends common_1.NotFoundException {
    constructor(gameId) {
        super(`Game ${gameId} not found`);
    }
}
exports.GameNotFoundException = GameNotFoundException;
class NotYourGameException extends common_1.ForbiddenException {
    constructor() {
        super('This game does not belong to you');
    }
}
exports.NotYourGameException = NotYourGameException;
class GameNotActiveException extends common_1.ConflictException {
    constructor(gameId) {
        super(`Game ${gameId} is not active`);
    }
}
exports.GameNotActiveException = GameNotActiveException;
/** The Redis-held live state expired (TTL) or was otherwise lost, but the durable row still shows ACTIVE — the game session is unrecoverable and must be treated as abandoned. */
class GameSessionExpiredException extends common_1.GoneException {
    constructor(gameId) {
        super(`The session for game ${gameId} has expired. This game will be settled as abandoned.`);
    }
}
exports.GameSessionExpiredException = GameSessionExpiredException;
