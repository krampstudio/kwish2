const r   = require('rethinkdb');
const run = require('./run.js');

const klistService = function (){

    return {
        get(name){
            if(typeof name !== 'string' || !name.length){
                return Promise.reject(new TypeError('Please give a valid name to retrieve a klist'));
            }
            return run(r.table('klists').filter(r.row('name').eq(name)))
                .then( cursor => cursor.toArray())
                .then( results => results && results.length > 0 ? results[0] : null );
        },
        getAll(){
            return run(r.table('klits').getAll())
                .then( cursor => cursor.toArray());
        }
    };
};

module.exports = klistService;
