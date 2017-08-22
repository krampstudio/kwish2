const r   = require('rethinkdb');
const run = require('./run.js');

const kitemService = function (){

    return {
        getListItems(listId){
            if(typeof listId !== 'string' || listId.trim().length === 0){
                return Promise.reject(new TypeError('Please give a valid klist id'));
            }
            return run(r.table('kitems').filter(r.row('list').eq(listId)))
                .then( cursor => cursor.toArray());
        }
    };
};

module.exports = kitemService;
