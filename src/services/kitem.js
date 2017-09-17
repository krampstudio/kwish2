const r   = require('rethinkdb');
const run = require('./run.js');

const kitemService = function (){

    return {
        getListItems(listId){
            if(typeof listId !== 'string' || listId.trim().length === 0){
                return Promise.reject(new TypeError('Please give a valid klist id'));
            }
            return run(r.table('kitems').filter(r.row('list').eq(listId)).orderBy('order'))
                .then( cursor => cursor.toArray());
        },

        bookItem(itemId, comment){
            if(typeof itemId !== 'string' || itemId.trim().length === 0){
                return Promise.reject(new TypeError('Please give a valid kitem id'));
            }
            let data = { booked : true };
            if(typeof comment === 'string' && comment.length > 0 && comment.length < 2048){
                data.comment = comment;
            }

            return run(r.table('kitems').get(itemId).update(data));
        },


        buyItem(itemId, comment){
            if(typeof itemId !== 'string' || itemId.trim().length === 0){
                return Promise.reject(new TypeError('Please give a valid kitem id'));
            }
            let data = { bought : true };
            if(typeof comment === 'string' && comment.length > 0 && comment.length < 2048){
                data.comment = comment;
            }
            return run(r.table('kitems').get(itemId).update(data));
        }
    };
};

module.exports = kitemService;
