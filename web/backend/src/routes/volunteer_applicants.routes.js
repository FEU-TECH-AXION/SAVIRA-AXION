const express = require("express");
const router = express.Router();
const {
  getItems,
  createItem,
  updateStatus,
  getMyApplication,
} = require("../controllers/volunteer_applicants.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const requireCommittee = require("../middleware/requireCommittee.middleware");
const requireMembershipCommittee = requireCommittee(2);

// Routes are kept thin or short since all the logic is in the controller
router.get("/", verifyToken, requireMembershipCommittee, getItems);
router.get("/my-application", verifyToken, getMyApplication);
router.post("/", createItem);
router.put("/:id", verifyToken, requireMembershipCommittee, updateStatus);

module.exports = router;
