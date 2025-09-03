"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
// Create uploads folder if it doesn't exist
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const otpRoutes_1 = __importDefault(require("./routes/otpRoutes"));
const friends_1 = __importDefault(require("./routes/friends"));
const user_1 = __importDefault(require("./routes/user"));
const room_1 = __importDefault(require("./routes/room"));
const group_1 = __importDefault(require("./routes/group"));
const user_2 = require("./middlewares/user");
dotenv_1.default.config();
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const upload_1 = __importDefault(require("./routes/upload"));
const path_1 = __importDefault(require("path"));
// import { fileURLToPath } from "url";
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
console.log();
const app = (0, express_1.default)();
const uploadsDir = path_1.default.join(__dirname, "uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir);
}
console.log(__dirname);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static('public')); // ✅ Correct
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads"))); // serve files
app.use((0, cookie_parser_1.default)());
app.get('/', (req, res) => {
    res.send('truth & dare Api running');
});
app.use('/api/upload', upload_1.default);
app.use('/api/otp', otpRoutes_1.default);
app.use('/api/friends', user_2.verifyToken, friends_1.default);
app.use('/api/user', user_1.default);
app.use('/api/room', user_2.verifyToken, room_1.default);
app.use('/api/group', user_2.verifyToken, group_1.default);
exports.default = app;
