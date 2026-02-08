"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminPwd, merchantPwd, admin, merchant, h1, h2, room1, today, days;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, bcrypt.hash('Admin12345!', 10)];
                case 1:
                    adminPwd = _a.sent();
                    return [4 /*yield*/, bcrypt.hash('Merchant12345!', 10)];
                case 2:
                    merchantPwd = _a.sent();
                    return [4 /*yield*/, prisma.users.upsert({
                            where: { email: 'admin@demo.com' },
                            update: {},
                            create: {
                                email: 'admin@demo.com',
                                password: adminPwd,
                                role: client_1.user_role.ADMIN,
                            },
                        })];
                case 3:
                    admin = _a.sent();
                    return [4 /*yield*/, prisma.users.upsert({
                            where: { email: 'merchant@demo.com' },
                            update: {},
                            create: {
                                email: 'merchant@demo.com',
                                password: merchantPwd,
                                role: client_1.user_role.MERCHANT,
                            },
                        })];
                case 4:
                    merchant = _a.sent();
                    return [4 /*yield*/, prisma.hotels.create({
                            data: {
                                name_cn: '星河酒店（演示）',
                                name_en: 'Starglow Hotel (Demo)',
                                address: '1 Demo Street',
                                city: 'Sydney',
                                star: 5,
                                type: 'Resort',
                                open_year: 2018,
                                status: client_1.hotel_status.APPROVED,
                                merchant_id: merchant.id,
                                hotel_images: {
                                    create: [
                                        { url: 'https://picsum.photos/seed/h1-1/800/600', sort: 1 },
                                        { url: 'https://picsum.photos/seed/h1-2/800/600', sort: 2 },
                                    ],
                                },
                                hotel_tags: {
                                    create: [{ tag: '海景' }, { tag: '含早餐' }, { tag: '亲子' }],
                                },
                                nearby_points: {
                                    create: [
                                        { type: 'attraction', name: 'Opera House', distance_km: 2.3 },
                                        { type: 'metro', name: 'Town Hall Station', distance_km: 1.1 },
                                    ],
                                },
                                review_summary: {
                                    create: { rating: 4.6, review_count: 128 },
                                },
                            },
                        })];
                case 5:
                    h1 = _a.sent();
                    return [4 /*yield*/, prisma.hotels.create({
                            data: {
                                name_cn: '城市便捷酒店（演示）',
                                name_en: 'City Easy Stay (Demo)',
                                address: '99 Example Ave',
                                city: 'Sydney',
                                star: 3,
                                type: 'Business',
                                open_year: 2012,
                                status: client_1.hotel_status.PENDING,
                                merchant_id: merchant.id,
                                hotel_tags: { create: [{ tag: '性价比' }, { tag: '近地铁' }] },
                            },
                        })];
                case 6:
                    h2 = _a.sent();
                    return [4 /*yield*/, prisma.rooms.create({
                            data: {
                                hotel_id: h1.id,
                                name: '豪华大床房',
                                capacity: 2,
                                base_price: 22000, // 用“分”避免浮点：$220.00 -> 22000
                                refundable: true,
                                breakfast: true,
                            },
                        })];
                case 7:
                    room1 = _a.sent();
                    today = new Date();
                    days = Array.from({ length: 7 }).map(function (_, i) {
                        var d = new Date(today);
                        d.setDate(today.getDate() + i);
                        d.setHours(0, 0, 0, 0);
                        return d;
                    });
                    return [4 /*yield*/, prisma.price_calendar.createMany({
                            data: days.map(function (d, i) { return ({
                                room_id: room1.id,
                                date: d,
                                price: 20000 + i * 1000,
                                promo_type: i % 3 === 0 ? 'discount' : null,
                                promo_value: i % 3 === 0 ? 10 : null,
                            }); }),
                            skipDuplicates: true,
                        })];
                case 8:
                    _a.sent();
                    console.log('✅ Seed done');
                    console.log('Demo accounts:');
                    console.log('ADMIN    admin@demo.com / Admin12345!');
                    console.log('MERCHANT merchant@demo.com / Merchant12345!');
                    console.log('Hotels:', h1.id, h2.id);
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
