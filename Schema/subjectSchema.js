const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subjectSchema = new Schema({
  Name: {
    type: String,
    required: true
  },
  SubjectLevel: {
    type: String,
    required: true
  },
  TimeAllocation: {
    type: Number,
    required: false
  },
  TotalQuestions: {
    type: Number,
    required: true
  },
  Questions: [{
    type: String,
    required: true
  }]
});

const Subject = mongoose.model('subjects', subjectSchema);

module.exports = Subject;
