const express = require('express');
const app = express();
const router = require('./controllers/router.js');

app.use(express.static('public'));


router(app);

app.listen(8080, () =>   console.log('kwish got started') );
