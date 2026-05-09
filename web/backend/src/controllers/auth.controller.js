const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const UserModel = require('../models/users.model')

const signup = async (req, res) => {

    try {
        const { firstName, lastName, email, password } = req.body

        // 2. Check duplicate email
        const existingEmail = await UserModel.findByEmail(email)
        if (existingEmail)
            return res.status(409).json({
                errors: [
                    {
                        path: 'email',
                        msg: 'Email is already registered. Please try again or',
                        link: { href: '/login', label: 'sign in' },
                    },
                ],
            })

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

const login = async (req, res) => {
    try {
        const { email, password } = req.body

        // 1. Validate fields
        if (!email || !password)
            return res.status(400).json({ error: 'All fields are required.' })

        // 2. Find user by email
        const user = await UserModel.findByEmail(email)
        console.log('User found:', user)
        if (!user)
            return res.status(401).json({ error: 'Invalid email or password.' })

        // 3. Compare password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch)
            return res.status(401).json({ error: 'Invalid email or password.' })

        // 4. Generate JWT
        const token = jwt.sign(
            { id: user.user_id, role: user.role_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        // 5. Return token and safe user data (never return password)
        const { password: _, ...safeUser } = user
        res.status(200).json({ token, user: safeUser })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { signup, login }