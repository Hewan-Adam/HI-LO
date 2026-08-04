"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStatus = exports.MoveResult = exports.PredictionType = exports.EqualRule = exports.AceMode = void 0;
var AceMode;
(function (AceMode) {
    AceMode["HIGH"] = "HIGH";
    AceMode["LOW"] = "LOW";
})(AceMode || (exports.AceMode = AceMode = {}));
var EqualRule;
(function (EqualRule) {
    EqualRule["PUSH"] = "PUSH";
    EqualRule["LOSS"] = "LOSS";
    EqualRule["REDRAW"] = "REDRAW";
})(EqualRule || (exports.EqualRule = EqualRule = {}));
var PredictionType;
(function (PredictionType) {
    PredictionType["HIGHER"] = "HIGHER";
    PredictionType["LOWER"] = "LOWER";
})(PredictionType || (exports.PredictionType = PredictionType = {}));
var MoveResult;
(function (MoveResult) {
    MoveResult["WIN"] = "WIN";
    MoveResult["LOSS"] = "LOSS";
    MoveResult["PUSH"] = "PUSH";
    MoveResult["REDRAW"] = "REDRAW";
})(MoveResult || (exports.MoveResult = MoveResult = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus["ACTIVE"] = "ACTIVE";
    GameStatus["CASHED_OUT"] = "CASHED_OUT";
    GameStatus["LOST"] = "LOST";
    GameStatus["ABANDONED"] = "ABANDONED";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
