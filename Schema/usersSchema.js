const mongoose = require('mongoose')

const streakSchema = new mongoose.Schema({
    Monday: { type: Boolean, required: true },
    Tuesday: { type: Boolean, required: true },
    Wednesday: { type: Boolean, required: true },
    Thursday: { type: Boolean, required: true },
    Friday: { type: Boolean, required: true },
    Saturday: { type: Boolean, required: true },
    Sunday: { type: Boolean, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    subjects: [{ type: String, required: true}],
    streaks: [streakSchema],
    email: { type: String, required: true, unique: true },
    questionInTotal: { type: Number, required: true }
});

const User = mongoose.model('users', userSchema);

module.exports = User;