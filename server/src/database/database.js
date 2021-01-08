const mongoose = require('mongoose');
const dbURL = "mongodb://127.0.0.1:27017/eat-at-unwsp"

// Setup database
mongoose
    .connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log(`eat@unwsp database has started at ${dbURL}.`))
    .catch(error => console.log(error));
