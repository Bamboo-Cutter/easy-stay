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
exports.UpsertHotelDto = void 0;
var class_validator_1 = require("class-validator");
var client_1 = require("@prisma/client");
var UpsertHotelDto = function () {
    var _a;
    var _name_cn_decorators;
    var _name_cn_initializers = [];
    var _name_cn_extraInitializers = [];
    var _name_en_decorators;
    var _name_en_initializers = [];
    var _name_en_extraInitializers = [];
    var _address_decorators;
    var _address_initializers = [];
    var _address_extraInitializers = [];
    var _city_decorators;
    var _city_initializers = [];
    var _city_extraInitializers = [];
    var _star_decorators;
    var _star_initializers = [];
    var _star_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _open_year_decorators;
    var _open_year_initializers = [];
    var _open_year_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpsertHotelDto() {
                this.name_cn = __runInitializers(this, _name_cn_initializers, void 0);
                this.name_en = (__runInitializers(this, _name_cn_extraInitializers), __runInitializers(this, _name_en_initializers, void 0));
                this.address = (__runInitializers(this, _name_en_extraInitializers), __runInitializers(this, _address_initializers, void 0));
                this.city = (__runInitializers(this, _address_extraInitializers), __runInitializers(this, _city_initializers, void 0));
                this.star = (__runInitializers(this, _city_extraInitializers), __runInitializers(this, _star_initializers, void 0));
                this.type = (__runInitializers(this, _star_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.open_year = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _open_year_initializers, void 0));
                // 商户一般只能把状态改到 PENDING / OFFLINE 等，你也可以在 service 限制
                this.status = (__runInitializers(this, _open_year_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                __runInitializers(this, _status_extraInitializers);
            }
            return UpsertHotelDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_cn_decorators = [(0, class_validator_1.IsString)()];
            _name_en_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _address_decorators = [(0, class_validator_1.IsString)()];
            _city_decorators = [(0, class_validator_1.IsString)()];
            _star_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            _type_decorators = [(0, class_validator_1.IsString)()];
            _open_year_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsEnum)(client_1.hotel_status)];
            __esDecorate(null, null, _name_cn_decorators, { kind: "field", name: "name_cn", static: false, private: false, access: { has: function (obj) { return "name_cn" in obj; }, get: function (obj) { return obj.name_cn; }, set: function (obj, value) { obj.name_cn = value; } }, metadata: _metadata }, _name_cn_initializers, _name_cn_extraInitializers);
            __esDecorate(null, null, _name_en_decorators, { kind: "field", name: "name_en", static: false, private: false, access: { has: function (obj) { return "name_en" in obj; }, get: function (obj) { return obj.name_en; }, set: function (obj, value) { obj.name_en = value; } }, metadata: _metadata }, _name_en_initializers, _name_en_extraInitializers);
            __esDecorate(null, null, _address_decorators, { kind: "field", name: "address", static: false, private: false, access: { has: function (obj) { return "address" in obj; }, get: function (obj) { return obj.address; }, set: function (obj, value) { obj.address = value; } }, metadata: _metadata }, _address_initializers, _address_extraInitializers);
            __esDecorate(null, null, _city_decorators, { kind: "field", name: "city", static: false, private: false, access: { has: function (obj) { return "city" in obj; }, get: function (obj) { return obj.city; }, set: function (obj, value) { obj.city = value; } }, metadata: _metadata }, _city_initializers, _city_extraInitializers);
            __esDecorate(null, null, _star_decorators, { kind: "field", name: "star", static: false, private: false, access: { has: function (obj) { return "star" in obj; }, get: function (obj) { return obj.star; }, set: function (obj, value) { obj.star = value; } }, metadata: _metadata }, _star_initializers, _star_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _open_year_decorators, { kind: "field", name: "open_year", static: false, private: false, access: { has: function (obj) { return "open_year" in obj; }, get: function (obj) { return obj.open_year; }, set: function (obj, value) { obj.open_year = value; } }, metadata: _metadata }, _open_year_initializers, _open_year_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpsertHotelDto = UpsertHotelDto;
