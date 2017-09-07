const r = require('rethinkdb');

const runHandler = (err, result) => {
    if(err){
        throw err;
    }
    console.log(JSON.stringify(result, null, 2));
}

r.connect( {host: 'localhost', port: 28015}, function(err, connection) {
    if (err) {
        throw err;
    }



    r.dbCreate('kwish').run(connection, runHandler);

});

