import express from "express";

// Import necessary dependencies
const cors = require('cors')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const winston = require('winston')
const morgan = require('morgan')
const nodemailer = require('nodemailer')
const bodyParser = require('body-parser')
const { combine, timestamp, align, printf } = winston.format;

// Connect to the user collection
const UserModel = require('./Schema/usersSchema');
// Connect to the subject collection
const SubjectModel = require('./Schema/subjectSchema');
// Connect to the questions collection
const QuestionModel = require('./Schema/questionSchema')

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://questionreviewbackend:1CKAzUkoZ5xpbV18zs3m@maincluster.hr4woka.mongodb.net/questions"

// JWT Secret Key
const SECRET_KEY = "SDfGIO97dfyiruGU67WeT45x560"


// Winston logger
const LoggingFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
});

const logger = winston.createLogger({
    // Info by default
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        // Set the time format
        timestamp({
            format: 'YYYY-MM-DD hh:mm:ss.SSS A',
        }),
        align(),
        LoggingFormat
    ),
    // Log to console and file
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'combined.log'
        }),
        new winston.transports.File({
            filename: 'error.log',
            level: 'error'
        })
    ]

})

// Transporter for the email
const transporter = nodemailer.createTransport({
    host: "smtp.126.com",
    port: 25,
    auth: {
        user: 'boypu123@126.com',
        pass: 'FWre6LBHrwU67RpA'
    }
});

// Pack all the useful logger functions into callable functions, reduce redundancy
function LoggingError(ip, err) {
    logger.error("Sender's IP: " + ip + " Error Encountered: " + err)
}
function LoggingInfo(ip, info) {
    logger.info("Sender's IP:" + ip + " Information:" + info)
}

// Connect Database
mongoose.connect(uri)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.error('MongoDB connection error:', err));

// Creating an express instance
const app = express();
app.use(cors())
// app.use(express.json());
app.use(express.json({limit: '200mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit: 500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000}));
// Use morgan automatic logging system
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim()) // Morgan logging redirecting to Winston
    }
}));

// Declare port
const PORT = 3000;

// Return user information
// pwd: real password, data: data passed in
function ReturnUserInfoInData(pwd, data) {
    /*
    The request follows the following structure:
    email: String
    The response follows the following structure:
    status: success or failed
    jwttoken
    name
    streaks
    */
    try {
        console.log("Data", data)
        // If there is a user with the respective email
        if (data.length != 0) {
            // Check password
            if (data[0].password == pwd) {
                console.log(data[0].streaks)
                let result = {
                    // Return all of the key information
                    succeed: true,
                    name: data[0].name,
                    subjects: data[0].subjects,
                    streaks: data[0].streaks,
                    questionInTotal: data[0].questionInTotal,
                    questionReviewed: data[0].questionReviewed,
                }
                return result
            } else {
                // If password is wrong
                let result = {
                    succeed: false,
                    message: "Login Failed. Wrong Password."
                }
                return result
            }
        } else {
            // If user not found
            let result = {
                succeed: false,
                message: "Login Failed. User Not Found."
            }
            return result
        }
    } catch (err) {
        // In case of an error
        // In Node.js, an error would halt the server completely. That is why we need to handle the errors specifically.
        console.log(err)
        return {
            succeed: false,
            message: "Error finding the data from the database"
        }
    }
}



// Here, we are packing this feature externally as an async function for better handling of asynchronous operations, in this case, the database interactions
async function FindSubjectInfo(id) {
    return await SubjectModel.findById(id);
}
async function FindUserInfo(email){
    return await UserModel.find({ email: email })
}


function VerifyJWT(token) {
    return new Promise((resolve, reject) => {
        // Verify the JWT token
        jwt.verify(token, SECRET_KEY, async (err, decoded) => {
            if (err) {
                // If token is invalid
                LoggingError("Error occurred when verifying JWT token. " + err);
                return resolve({ succeed: false, status: 403 });
            } else {
                let email = decoded.email;
                try {
                    // Fetch user information based on email
                    let userInfo = await FindUserInfo(email);
                    let pwd = decoded.password;
                    // Check the user information and password
                    let result = ReturnUserInfoInData(pwd, userInfo);
                    if (result.succeed) {
                        // Add token, email and password in the response
                        result['token'] = token;
                        result['email'] = email;
                        result['password'] = pwd;
                        return resolve(result);
                    } else {
                        // If authentication fails, return a 403 status
                        return resolve({ succeed: false, status: 403 });
                    }
                } catch (error) {
                    // Log any errors that occur during the user info retrieval
                    LoggingError("Error fetching user info: " + error);
                    return resolve({ succeed: false, status: 403 });
                }
            }
        });
    });
}





app.get('/get-questions', async (req, res) => {
    // Note that we are passing in pure ID strings, not ObjectIDs
    // IdStrings is an array storing all the ID strings of questions
    const IdStrings = req.query.ids;
    console.log(IdStrings)
    try{
    // To allow database conciseness, all of the information are stored in ObjectID Strings, not ObjectID, as json cannot pass in ObjectIDs. We need to map it to use find.
    const objectIds = IdStrings.map(id => new mongoose.Types.ObjectId(id))
    console.log(objectIds)
    // Use $in ({ _id: { $in: objectIds }}) to search up all the document, creating the schema
    QuestionModel.find({ _id: { $in: objectIds } })
        .then(documents => {
            LoggingInfo(req.ip, "Question found successfully, ID String: " + IdStrings)
            console.log(documents)
            res.status(200).json(documents)
        })
        .catch(err => {
            LoggingError(req.ip, err)
        })
    }catch(err){
        LoggingError(req.ip, "An error has occurred. Error: " + err)
    }
})



// To get subject information
// The accepted request is an array - so that the client does not have to send tons of requests for each subject
app.get('/get-subjects-info', async (req, res) => {
    // Passing in a list of ObjectID to find a subject
    const ids = req.query.ids;
    console.log(req.query)
    // Store all the results
    let results = [];
    // Try catch to see whether there are some errors
    try {
        for (const id of ids){
            let data = await FindSubjectInfo(id)
            // When a subject is found
            if (data != null) {
                console.log(data)
                // Passing back the result & jsonify
                let result = {
                    message: "OK",
                    _id: data._id.toString(),
                    Name: data.Name,
                    SubjectLevel: data.SubjectLevel,
                    TimeAllocation: data.TimeAllocation,
                    TotalQuestions: data.TotalQuestions,
                    Questions: data.Questions
                }
                results.push(result)
            } else {
                // Or else, pass back the information that the subject cannot be found
                results.push({ "message": "Could not find the specified subject" })
            }
        }
        res.json(results)
    } catch(err) {
        // If an error has occurred
        LoggingError(req.ip, err)
        res.json({ "message": "An error has occurred" })
    }
})



app.get('/testing', (req, res) => {
    res.send({
        message: "Success!"
    })
})



app.post('/verify', async (req, res) => {
    let token = req.body.token;
    let result = await VerifyJWT(token);
    if (result.succeed == true) {
        res.status(200).json(result)
    } else {
        res.status(403).json({ succeeded: false, message: "Invalid token. Try logging in again." })
    }
})

// Would allow the user to change their username and password
app.post('/modify-user', async(req, res) => {
    // Get information
    let token = req.body.token;
    let result = await VerifyJWT(token);

    console.log(result)
    if (result.succeed == true) {
        let data = {
            name: req.body.username,
        }
        let email = req.body.email;
        // Only if the password is not empty, change the password
        if (req.body.NewPassword !== "") {
            data.password = req.body.NewPassword;
            console.log(result.password)
            console.log(req.body.OriginalPassword)
            // Check whether the original password passed in is correct and the user want to update the password
            if (result.password != req.body.OriginalPassword) {
                // Change the email user have passed in to let it not fulfil the next condition - to make surthere are less ifs together twining with each other
                console.log("I am here")
                email = ""
            }
        }
        // Check that the token provided can modify the specific user's info
        console.log(result.email)
        console.log(email)
        if (result.email == email) {
            UserModel.findOneAndUpdate(
                { email: req.body.email }, 
                { $set: data }
            )
            .then(documents => {
                res.json({ "message": "OK" })
                console.log("Updated Document",documents)
            })
            .catch(err => {
                LoggingError(req.ip, err)
                res.json({"Message": "Something went wrong."})
            })
        }else{
            res.json({ succeeded: false, message: "Invalid token or password. Try logging in again." })
        }
    }else{
        res.json({ succeeded: false, message: "Invalid token. Try logging in again." })
    }
})

app.post('/delete-user', async(req, res) => {
    // Get information
    let token = req.body.token;
    let result = await VerifyJWT(token);

    if (result.succeed == true) {
        let email = req.body.email;
        // Check that the token provided can modify the specific user's info
        if (result.email == email) {
            UserModel.findOneAndDelete(
                { email: req.body.email }
            )
            .then(documents => {
                res.json({ "message": "OK" })
                console.log("Updated Document",documents)
            })
            .catch(err => {
                LoggingError(req.ip, err)
                res.json({"Message": "Something went wrong."})
            })
        }else{
            res.json({ succeeded: false, message: "Invalid token or password." })
        }
    }else{
        res.json({ succeeded: false, message: "Invalid token." })
    }
})

app.post('/add-subject', async(req, res) => {
    // Get the tokens and the information to make sure this is not a sad operation by some sad people
    let token = req.body.token;
    // Verify the token and return the user's info
    let verification = await VerifyJWT(token);

    // If the token is valid
    if (verification.succeed == true) {
        let id = new mongoose.Types.ObjectId()
        // Define the subject document
        let newSubject = new SubjectModel({
            _id: id,
            Name: req.body.Name,
            SubjectLevel: req.body.SubjectLevel,
            TimeAllocation: Number(req.body.TimeAllocation) || 0,
            TotalQuestions: 0,
            Questions: []
        })
        // Save the newSubject object
        newSubject.save()
        .then(documents => {
            // Update the user document to include the new subject
            UserModel.findOneAndUpdate(
                {'email': verification.email},
                { $push: { subjects: id.toString() } },
                { new: true }
            )
            .then(documents => {
                res.status(200).json({ "message": "OK" })
                console.log("Updated Document",documents)
            })
            .catch(err => {
                LoggingError(req.ip, err)
            })
        })
        .catch(err => {
            LoggingError(req.ip, err)
        })

    }
})

app.post('/delete-subject', async(req, res) => {
    // Get the tokens and the information to make sure this is not a sad operation by some sad people
    let token = req.body.token;
    let deletedID = req.body.id;
    let questions = req.body.questions;
    let deletedIDObject = new mongoose.Types.ObjectId(deletedID)
    // Verify the token and return the user's info
    let verification = await VerifyJWT(token);
    // If the token is valid
    if (verification.succeed == true) {
        // If the user have permission to delete that subject
        if (verification.subjects.includes(deletedID)) {
            SubjectModel.deleteOne({'_id': deletedIDObject})
            .then(documents => {
                // As multiple users may have that subject, we need to update all of them
                UserModel.updateMany(
                    { subjects: deletedID },
                    { 
                        $pull: { subjects: deletedID },
                        $inc: { TotalQuestions: -Number(questions) }
                },
                    { new: true }
                )
                .then(documents => {
                    res.status(200).json({ "message": "OK" })
                    console.log("Updated Document",documents)
                })
                .catch(err => {
                    LoggingError(req.ip, err)
                })
            })
        }
    }
})

app.post('/delete-question', async (req, res) => {
    // First, verify the user have the permission to delete the specific question.
    let token = req.body.token;
    console.log(token)
    let verification = await VerifyJWT(token);
    let QuestionId = req.body.QuestionId;
    console.log("Verification", verification)
    if (verification.succeed == true) {
        console.log("Succeed")
        // If the subject of a question belongs to the user
        // Find the question document itself which includes the information about the subject it belongs to
        const QuestionIdObject = new mongoose.Types.ObjectId(QuestionId)
        let Question = await QuestionModel.find({'_id': QuestionIdObject})
        // let Question = await QuestionModel.findById(QuestionId)
        // If the question exists
        if (Question != []) {
            // If this question's subject is in the subject the user belongs to
            const SubjectIdObject = new mongoose.Types.ObjectId(Question[0].Subject)
            if (verification.subjects.indexOf(SubjectIdObject) !== -1){
                // Delete the relevant question from subject model
                SubjectModel.findOneAndUpdate(
                    {_id: SubjectIdObject},
                    { $pull : { Questions: QuestionId }}
                )
                .catch(err => {
                    LoggingError(req.ip, err)
                })
                QuestionModel.deleteOne({'_id': QuestionIdObject})
                // Delete the document
                .then(documents => {
                    res.status(200).json({'message': 'OK'})
                    // Log the info
                    LoggingInfo(req.ip, "A user have just deleted a question. The id of the deleted question is " + QuestionId + " and it belongs to the subject " + Question[0].Subject + ".")
                })
                .catch(err => {
                    LoggingError(req.ip, err)
                })


            }
        } else {
            res.message(409).json({ 'status': 'Failed' })
        }

    } else {
        res.status(409).json({ 'message': 'Failed' })
    }
})



app.post('/add-modify-question', async (req, res) => {
    console.log(req.body)
    console.log(req.body._id)
    // All of the data
    let Marks = req.body.Marks;
    let QuestionImage = req.body.QuestionImage;
    let QuestionInText = req.body.QuestionInText;
    let ExplanationImage = req.body.ExplanationImage;
    let ExplanationInText = req.body.ExplanationInText;
    let PreviousAnswerImage = req.body.PreviousAnswerImage;
    let PreviousAnswerInText = req.body.PreviousAnswerInText;
    let WhyThisIsWrong = req.body.WhyThisIsWrong;
    let Subject = req.body.Subject;
    let Labels = req.body.Labels;
    let NextRevisionDate = req.body.NextRevisionDate;
    let questionIndex = req.body.questionIndex;

    // If it is creating a new question
    if (req.body._id == ""){
        let _id = new mongoose.Types.ObjectId();
        // Update the questionIndex - to let it be the last one
        questionIndex = await QuestionModel.countDocuments({'Subject': Subject});
        // Creating a new model
        const newQuestion = new QuestionModel({
            _id: _id,
            QuestionIndex: questionIndex,
            Marks: Marks,
            QuestionImage: QuestionImage,
            QuestionInText: QuestionInText,
            ExplanationImage: ExplanationImage,
            ExplanationInText: ExplanationInText,
            PreviousAnswerImage: PreviousAnswerImage,
            PreviousAnswerInText: PreviousAnswerInText,
            WhyThisIsWrong: WhyThisIsWrong,
            Labels: Labels,
            Subject: Subject,
            IncorrectTimes: 0,
            RevisionTimes: 0,
            NextRevisionDate: NextRevisionDate
        })
        newQuestion.save()
        .then(documents => {
            res.json({'message': 'OK'})
            LoggingInfo(req.ip, "A user have just added a question. The id of the added question is " + newQuestion._id + " and it belongs to the subject " + Subject + ".")
        })
        .catch(err => {
            LoggingError(req.ip, err)
            console.log(err)
        })
        // Update the subject model
        let SubjectId = new mongoose.Types.ObjectId(Subject)
        SubjectModel.findOneAndUpdate(
            {"_id": SubjectId}, 
            {$push: {Questions: _id.toString()}}
        )
        .then(documents => {
            console.log("Success")

        })
        .catch(err => {
            LoggingError(req.ip, err)
            console.log(err)
        })
        // Update the user model
        UserModel.updateMany(
            {"subjects": Subject},
            {"$inc": {"questionInTotal": 1}}
        )
        .then(document => {
            console.log("Success")
        })
        .catch(err => {
            LoggingError(req.ip, err)
            console.log(err)
        })

    }else{
        console.log(req.body._id)
        // If it is editing a question
        // All of the data
        let _id = new mongoose.Types.ObjectId(req.body._id);
        console.log(_id)
        const updateFields = {};

        // Other non image fields
        updateFields.QuestionIndex = questionIndex;
        updateFields.Marks = Marks;
        updateFields.QuestionInText = QuestionInText;
        updateFields.ExplanationInText = ExplanationInText;
        updateFields.PreviousAnswerInText = PreviousAnswerInText;
        updateFields.WhyThisIsWrong = WhyThisIsWrong;
        updateFields.Labels = Labels;
        
        // Only update when Image is not 0 - prevent overwriting
        if (QuestionImage !== "") updateFields.QuestionImage = QuestionImage;
        if (ExplanationImage !== "") updateFields.ExplanationImage = ExplanationImage;
        if (PreviousAnswerImage !== "") updateFields.PreviousAnswerImage = PreviousAnswerImage;
        
        // Update
        QuestionModel.findOneAndUpdate(
          { _id: _id },
          { $set: updateFields },
          { new: true }
        ).then((doc) => {
          console.log('Update successful:', doc);
        }).catch((err) => {
          console.error('Error during update:', err);
        });
        
    }


})

app.post('/modify-question-revisiondate', async (req, res) => {
    // All of the data
    let _id = new mongoose.Types.ObjectId(req.body._id);
    let NextRevisionDate = req.body.NextRevisionDate;
    let RevisionTimes = req.body.RevisionTimes;
    let IncorrectTimes = req.body.IncorrectTimes;
    // Find and update the revision date and time
    QuestionModel.findOneAndUpdate({ _id: _id }, {
        NextRevisionDate: NextRevisionDate,
        RevisionTimes: RevisionTimes,
        IncorrectTimes: IncorrectTimes
    })
    .then(document => {
        res.json({'message': 'OK'})
    })
    .catch(err => {
        LoggingError(req.ip, err)
    })
})

app.post('/login', async (req, res) => {
    // Get all of the data
    console.log(req.body);
    const email = req.body.email;
    const pwd = req.body.password;
    const data = await UserModel.find({ email: email })
    let result = ReturnUserInfoInData(pwd, data);
    console.log("Result", result)
    if (result.succeed == true) {
        // Add a token in the response
        // JWT Token Information Style: {email: email, password: pwd}
        let token = jwt.sign({ email: email, password: pwd }, SECRET_KEY, { expiresIn: '745h' });
        // Add the token to the result
        result['token'] = token;
        console.log(result)
        // Return
        LoggingInfo(req.ip, "Logged in successfully. Account: " + email)
        res.status(200).json(result);
    } else {
        // If login is unsuccessful, log the error and pass back the result
        logger.warn("Sender's IP: " + req.ip + "Login Unsuccessful. Trying to login " + email + "Type: " + result.message)
        res.status(403).json(result);
    }
})



app.post('/register', async (req, res) => {
    // Get all information
    console.log(req.body)
    const name = req.body.name;
    const email = req.body.email;
    const pwd = req.body.password;
    const data = await UserModel.find({ email: email })
    let result = ReturnUserInfoInData(pwd, data);
    console.log(result)
    // If a user with the email provided does not exist
    console.log(result.succeed)
    if (result.succeed == false && result.message != "Login Failed. Wrong Password.") {
        // Define the user schema
        const newUser = new UserModel({
            name: name,
            password: pwd,
            subjects: [],
            streaks: [
                {
                    Monday: false,
                    Tuesday: false,
                    Wednesday: false,
                    Thursday: false,
                    Friday: false,
                    Saturday: false,
                    Sunday: false
                }
            ],
            email: email,
            questionInTotal: 0,
            questionReviewed: 0
        });
        // Save the user schema
        newUser.save()
            .then(() => {
                LoggingInfo(req.ip, "A new user have just registered. User's email: " + email)
                res.status(200).json({ 'message': 'OK' })
            })
            .catch(err => {
                LoggingError(req.ip, "Error registering user. Error: ", err)
            })
    }
    else {
        LoggingInfo(req.ip, "A user could not be registered since a user with the email provided already exists. Email: " + email)
        res.json({ 'message': 'The user with the email provided already exists' })
    }
})


// Forgot password logic
// First request - pass on a email request for a verification code
// Second request - pass on a verification code, the same email and the new password

let verificationCodeStore = {}

app.post('/forgot-password-verification', async (req, res) => {
    let email = req.body.email;
    let userDocument = await FindUserInfo(email)

    // When the user is found
    if (userDocument.length!==0){
        // Generate a 6-digit verification code + the expiry time
        let verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        let expiresAt = Date.now() + 10 * 60 * 1000;
        // Store the verification code & the expiry time, attributed under the user's email, in verificationCodeStore
        verificationCodeStore[email] = { verificationCode, expiresAt }
        console.log(verificationCodeStore)
        let mailOptions = {
            from: 'boypu123@126.com',
            to: email,
            subject: 'Question-to-Review Set - Password Reset',
            html: 'Your verification code for resetting your password is <b>' + verificationCode + '</b>. Valid for 10 minutes. Do not share it with anyone.'
        }
        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                LoggingError(req.ip, "An error has occurred when sending emails: " + error)
                res.json({'message': 'Error'})
            } else {
                console.log('Email sent: ' + info.response)
                res.json({'message': 'OK'})
            }
        })
    }else{
        res.json({'message':'User Not Found'})
    }
})

// Function of validating the verification code and changing the password
app.post('/forgot-password', async(req, res) => {
    let email = req.body.email;
    let userVerificationCode = req.body.code;
    // The password passed in should be already encrypted
    let newPassword = req.body.password;
    let data = verificationCodeStore[email];
    console.log(data)
    let timeNow = Date.now()
    try{
        // If the verification code has not expired yet
        if (data.expiresAt > timeNow){
            // If the verification code is correct
            if (userVerificationCode == data.verificationCode){
                console.log("Verification code is correct")
                // Update the new password
                UserModel.findOneAndUpdate(
                    {'email': email},
                    {'password': newPassword},
                )
                // Then send back the response
                .then(document => {
                    res.json({'message': 'OK'})
                    LoggingInfo(req.ip, email + " have just changed its password.")
                    
                })
                .catch(err => {
                    res.json({'message': 'Server Error.'})
                    LoggingError(req.ip, "Password update failed for " + email + ". Error: " + err)
                })
            }else{
                // If verification code is incorrect
                res.json({'message': 'Verification code is incorrect.'})
            }
        }else{
            // If the verification code has expired
            res.json({'message': 'Verification code has expired.'})
        }
    }catch(err){
        // If an unexpected error occurred
        res.status(500).json({'message': 'Error'})
        LoggingError(req.ip, "Password update failed. Error: " + err)
    }
})

app.listen(PORT, () => {
    console.log("This server is running on port 3000")
})