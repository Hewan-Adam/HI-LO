"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger('ExceptionFilter');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const isHttpException = exception instanceof common_1.HttpException;
        const status = isHttpException ? exception.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse = isHttpException ? exception.getResponse() : null;
        const message = this.extractMessage(exceptionResponse, exception, status);
        const body = {
            statusCode: status,
            error: isHttpException ? exception.constructor.name.replace('Exception', '') : 'InternalServerError',
            message,
            path: request?.url ?? 'unknown',
            timestamp: new Date().toISOString(),
        };
        if (status >= 500) {
            // Full detail (including stack) goes to the server log only — never to the client.
            this.logger.error(`${request?.method ?? ''} ${request?.url ?? ''} -> 500`, exception instanceof Error ? exception.stack : String(exception));
            body.message = 'An unexpected error occurred';
        }
        response.status(status).json(body);
    }
    extractMessage(exceptionResponse, exception, status) {
        if (status >= 500)
            return 'An unexpected error occurred';
        if (typeof exceptionResponse === 'string')
            return exceptionResponse;
        if (exceptionResponse && typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
            return exceptionResponse.message;
        }
        return exception instanceof Error ? exception.message : 'Unknown error';
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
