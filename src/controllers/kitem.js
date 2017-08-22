
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
    }
};
module.exports = kitemController;
