const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    QuestionIndex: { type: Number, required: false },
    Marks: { type: Number, required: false },
    QuestionImage: { type: String, required: false },
    QuestionInText: { type: String, required: false },
    ExplanationImage: { type: String, required: false },
    ExplanationInText: { type: String, required: false },
    PreviousAnswerImage: { type: String, required: false },
    PreviousAnswerInText: { type: String, required: false },
    WhyThisIsWrong: { type: String, required: false },
    Labels: { type: [String], required: false },
    NextRevisionDate: { type: String, required: false },
    RevisionTimes: { type: Number, required: false },
    Subject: { type: String, required: true },
    IncorrectTimes: { type: Number, required: true }
});

  
const Questions = mongoose.model('questions', questionSchema);

module.exports = Questions;
