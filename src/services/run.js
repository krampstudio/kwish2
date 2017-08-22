const rethinkdb = require('rethinkdb');
const config    = require('../../config/default.js');

/**
 * Manages connection configuration.
 * @returns {Promise}
 */
const run = function (query){

    return new Promise( (resolve, reject) => {
        let connection;
        const close = () => {
            if(connection){
                connection.close();
            }
        };

        if(typeof query !== 'function'){
            return reject(new TypeError('A valid rethinkdb query is required'));
        }

        rethinkdb
            .connect(config.rethinkdb)
            .then( c => connection = c)
            .then( () => query.run(connection) )
            .then( data => {
                close();
                resolve(data);
            })
            .catch( err => {
                close();
                reject(err);
            });
    });
};

module.exports = run;
