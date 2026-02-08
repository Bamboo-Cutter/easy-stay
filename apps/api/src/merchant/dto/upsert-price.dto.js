"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsertPriceDto = void 0;
var class_validator_1 = require("class-validator");
var UpsertPriceDto = function () {
    var _a;
    var _date_decorators;
    var _date_initializers = [];
    var _date_extraInitializers = [];
    var _price_decorators;
    var _price_initializers = [];
    var _price_extraInitializers = [];
    var _promo_type_decorators;
    var _promo_type_initializers = [];
    var _promo_type_extraInitializers = [];
    var _promo_value_decorators;
    var _promo_value_initializers = [];
    var _promo_value_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpsertPriceDto() {
                this.date = __runInitializers(this, _date_initializers, void 0); // 例如 2026-02-02T00:00:00.000Z
                this.price = (__runInitializers(this, _date_extraInitializers), __runInitializers(this, _price_initializers, void 0));
                this.promo_type = (__runInitializers(this, _price_extraInitializers), __runInitializers(this, _promo_type_initializers, void 0));
                this.promo_value = (__runInitializers(this, _promo_type_extraInitializers), __runInitializers(this, _promo_value_initializers, void 0));
                __runInitializers(this, _promo_value_extraInitializers);
            }
            return UpsertPriceDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _date_decorators = [(0, class_validator_1.IsISO8601)()];
            _price_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            _promo_type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _promo_value_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)()];
            __esDecorate(null, null, _date_decorators, { kind: "field", name: "date", static: false, private: false, access: { has: function (obj) { return "date" in obj; }, get: function (obj) { return obj.date; }, set: function (obj, value) { obj.date = value; } }, metadata: _metadata }, _date_initializers, _date_extraInitializers);
            __esDecorate(null, null, _price_decorators, { kind: "field", name: "price", static: false, private: false, access: { has: function (obj) { return "price" in obj; }, get: function (obj) { return obj.price; }, set: function (obj, value) { obj.price = value; } }, metadata: _metadata }, _price_initializers, _price_extraInitializers);
            __esDecorate(null, null, _promo_type_decorators, { kind: "field", name: "promo_type", static: false, private: false, access: { has: function (obj) { return "promo_type" in obj; }, get: function (obj) { return obj.promo_type; }, set: function (obj, value) { obj.promo_type = value; } }, metadata: _metadata }, _promo_type_initializers, _promo_type_extraInitializers);
            __esDecorate(null, null, _promo_value_decorators, { kind: "field", name: "promo_value", static: false, private: false, access: { has: function (obj) { return "promo_value" in obj; }, get: function (obj) { return obj.promo_value; }, set: function (obj, value) { obj.promo_value = value; } }, metadata: _metadata }, _promo_value_initializers, _promo_value_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpsertPriceDto = UpsertPriceDto;
