
const kitemService = require('../services/kitem.js');

const kitemController = {

    getListItems(request, response, next){
        const listId = request.query.list;
        kitemService()
            .getListItems(listId)
            .then( items => {
                if(items && items.length){
                    return response.json(items);
                }
                return response.json([]);
            })
            .catch(next);
    },

    bookItem(request, response, next){
        const itemId = request.query.item;
        kitemService()
            .bookItem(itemId)
            .then( done => {
                console.log(done);
                if(done){
                    return response.sendStatus(200);
                }
                return response.json(204);
            })
            .catch(next);
    },


    buyItem(request, response, next){
        const itemId = request.query.item;
        kitemService()
            .buyItem(itemId)
            .then( done => {
                console.log(done);
                if(done){
                    return response.sendStatus(200);
                }
                return response.json(204);
            })
            .catch(next);
    }
};
module.exports = kitemController;
