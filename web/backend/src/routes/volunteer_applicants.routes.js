const express = require("express");
const router = express.Router();
const {
  getItems,
  createItem,
  updateStatus,
} = require("../controllers/volunteer_applicants.controller");

// Routes are kept thin or short since all the logic is in the controller
router.get("/", getItems);
router.post("/", createItem);
router.put("/:id", updateStatus);

module.exports = router;
