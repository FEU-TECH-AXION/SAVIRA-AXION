const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const UserModel = require('../models/users.model')

const signup = async (req, res) => {

    try {
        const { firstName, lastName, email, password } = req.body

        // 1. Validate required fields
        if (!firstName || !lastName || !email || !password)
            return res.status(400).json({ error: 'All fields are required.' })

        // 2. Check duplicate email
        const existingEmail = await UserModel.findByEmail(email)
        if (existingEmail)
            return res.status(409).json({ error: 'Email already in use.' })

        // 3. Auto-generate username and check for duplicates
        let username = `${email.split('@')[0]}${Math.floor(Math.random() * 10000)}`
        const existingUsername = await UserModel.findByUsername(username)
        if (existingUsername)
            username = `${email.split('@')[0]}${Math.floor(Math.random() * 100000)}`

        // 4. Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // 5. Create user
        const newUser = await UserModel.create({
            user_id:    uuidv4(),
            email:      email,
            role_id:    1,
            first_name: firstName,
            last_name:  lastName,
            user_name:  username,
            password:   hashedPassword,
        })

        res.status(201).json({ message: 'Account created successfully.', user: newUser })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { signup }