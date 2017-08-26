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

        bookItem(itemId){
            if(typeof itemId !== 'string' || itemId.trim().length === 0){
                return Promise.reject(new TypeError('Please give a valid kitem id'));
            }
            return run(r.table('kitems').get(itemId).update({ 'booked' : true }));
        },


        buyItem(itemId){
            if(typeof itemId !== 'string' || itemId.trim().length === 0){
                return Promise.reject(new TypeError('Please give a valid kitem id'));
            }
            return run(r.table('kitems').get(itemId).update({ 'bought' : true }));
        }
    };
};

module.exports = kitemService;
