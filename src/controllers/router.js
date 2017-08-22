const klistController = require('./klist.js');
const kitemController = require('./kitem.js');

const router = function (app){

    app.get('/klist/:name', klistController.getOne);
    app.get('/kitems', kitemController.getListItems);
};

module.exports = router;
