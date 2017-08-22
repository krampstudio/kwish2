
const klistService = require('../services/klist.js');

const klistController = {

    getOne(request, response, next){
        const listName = request.params.name;
        klistService()
            .get(listName)
            .then( list => {
                if(list && list.id){
                    return response.json(list);
                }
                return response.send(404);
            })
            .catch(next);
    }
};
module.exports = klistController;
