const jwt = require('jsonwebtoken')

let email = "testing@testing.com"
let pwd = "123"
const SECRET_KEY = "SDfGIO97dfyiruGU67WeT45x560"
let token = jwt.sign({ email: email, password: pwd }, SECRET_KEY, { expiresIn: '745h' });
console.log(token)