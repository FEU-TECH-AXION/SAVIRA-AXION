const express = require("express");
const router = express.Router();
const {
  getItems,
  createItem,
  updateStatus,
  getMyApplication,
} = require("../controllers/volunteer_applicants.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Routes are kept thin or short since all the logic is in the controller
router.get("/", getItems);
router.get("/my-application", verifyToken, getMyApplication);
router.post("/", createItem);
router.put("/:id", updateStatus);

module.exports = router;

module.exports = router;
