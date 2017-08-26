const klistController = require('./klist.js');
const kitemController = require('./kitem.js');

const router = function (app){

    app.get('/klist/:name', klistController.getOne);
    app.get('/kitems', kitemController.getListItems);
    app.post('/kitem/book', kitemController.bookItem);
    app.post('/kitem/buy', kitemController.buyItem);

    app.get('/:name', (request, response) => response.sendFile('index.html', { root:  'public' } ));
};

module.exports = router;
