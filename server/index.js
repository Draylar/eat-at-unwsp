// Libraries
const express = require('express');
const cors = require('cors');
const path = require('path');

// Other JS files
const routes = require('./src/api_routes');
const database = require('./src/database/database');

// Application parameters
const PORT = 5500;

// Setup server
const server = express();
server.use(cors());
server.use(express.json());
server.use(express.static(path.join(__dirname, '..', 'public')));
server.use('/api', routes);


server.listen(PORT, () => {
    console.log(`eat@unwsp server has started on port ${PORT}.`);
});