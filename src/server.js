const express = require('express');
const bodyParser = require('body-parser');
const router = require('./controllers/router.js');


const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));



router(app);

app.listen(8080, () =>   console.log('kwish got started') );
