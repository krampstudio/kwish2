import modal from './modal.js';

const confirmFactory = function (title = 'Please confirm', message = '', done){

    return modal(title, message, [{
        label : 'Annuler',
        close : true,
    }, {
        label : 'Confirmer',
        close : true,
        action : done
    }]);
};

export default confirmFactory;
