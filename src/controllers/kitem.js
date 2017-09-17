
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
        console.log(request.body);
        const comment = request.body.comment;
        kitemService()
            .bookItem(itemId, comment)
            .then( done => {
                if(done){
                    return response.sendStatus(200);
                }
                return response.json(204);
            })
            .catch(next);
    },


    buyItem(request, response, next){
        const itemId = request.query.item;
        const comment = request.body.comment;
        kitemService()
            .buyItem(itemId, comment)
            .then( done => {
                if(done){
                    return response.sendStatus(200);
                }
                return response.json(204);
            })
            .catch(next);
    }
};
module.exports = kitemController;
