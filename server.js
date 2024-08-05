const express = require('express');
const { PORT } = require('./config.js');

const app = express();
app.use(express.static('wwwroot'));
app.use(require('./routes/auth.js'));
app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });