const UserModel = require('../models/users.model')

const getItems = async (req, res) => {
    try {
        const data = await UserModel.getAll()
        res.json(data)
    } catch (err) {
        // 500 here because the failure is on our side (DB/Supabase), not the client's
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        // req.body is passed directly — input validation should be added here
        // before hitting the DB (e.g. check required fields, sanitize input)
        const item = await UserModel.create(req.body)

        // 201 instead of 200 to explicitly signal a resource was created
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const loginUser = async (req, res) => {
    try {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    const user = await UserModel.login(email, password);

    // Remove password from response
    const { password: _, ...safeUser } = user;

    res.json({ user: safeUser });
    } catch (err) {
    res.status(401).json({ error: err.message });
    }
};

module.exports = { getItems, createItem, loginUser }