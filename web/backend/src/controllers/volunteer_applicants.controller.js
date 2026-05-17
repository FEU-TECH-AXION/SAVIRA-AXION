const VolunteerApplicantsModel = require("../models/volunteer_applicants.model");

const getItems = async (req, res) => {
  try {
    const data = await VolunteerApplicantsModel.getAll();
    res.json(data);
  } catch (err) {
    // 500 here because the failure is on our side (DB/Supabase), not the client's
    res.status(500).json({ error: err.message });
  }
};

const createItem = async (req, res) => {
  try {
    // req.body is passed directly — input validation should be added here
    // before hitting the DB (e.g. check required fields, sanitize input)
    const item = await VolunteerApplicantsModel.create(req.body);

    // 201 instead of 200 to explicitly signal a resource was created
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// In volunteer_applicants.controller.js
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const item = await VolunteerApplicantsModel.update(id, { status, notes });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMyApplication = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required." });

    const UserModel = require("../models/users.model");
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const apps = await VolunteerApplicantsModel.getByEmail(user.email);
    res.json({ data: apps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getItems, createItem, updateStatus, getMyApplication };
