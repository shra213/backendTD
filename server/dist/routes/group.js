"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const grp_controller_1 = require("../controllers/grp.controller");
const router = (0, express_1.Router)();
router.route('/createGrp').post(grp_controller_1.createGrp);
router.route('/sendmsg').post(grp_controller_1.sendGroupMessage);
router.route('/allgroups').get(grp_controller_1.getGroups);
exports.default = router;
