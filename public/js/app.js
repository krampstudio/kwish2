import 'whatwg-fetch';
import modal from './components/modal.js';

const kitems = {};

const kitemsContainer = document.querySelector('.kitems');

const getKitemContent = item => {
    let content  = `
                <div class="headmage">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <h2>${item.name}</h2>
                <div>
                    <span class="icon icon-${item.exact ? 'alert' : 'gift'}"></span> ${item.exact ? 'Modèle exacte' : 'Modèle libre / Idée cadeau'}
                </div>
                <p class="desc">${item.desc}</p>
                <div class="price">
                    <progress value="${item.funded}" max="${item.price}" title="Reste ${item.price - item.funded} €"></progress>
                    <span class="amount">${item.price}</span>
                </div>`;
    if(item.booked){
        content += '<strong>Article réservé</strong>';
    } else if (item.bought){
        content += '<strong>Article acheté</strong>';
    } else {
        content += `
                <ul class="actions">
                    <li><a href="${item.url}" target="_blank" ><span class="icon icon-globe"></span> Site web</a></li>
                    <li><a href="#" class="book"><span class="icon icon-lock"></span> Réserver</a></li>
                    <li><a href="#" class="buy"><span class="icon icon-credit-card"></span> Acheter</a></li>
                    <li><a href="#" class="participate"><span class="icon icon-squirrel"></span> Participer</a></li>
                </ul>`;
    }
    return content;
};

const addItem = item => {
    const kitem = document.createElement('article');
    kitem.classList.add('kitem');
    kitem.dataset.id = item.id;
    kitem.innerHTML = getKitemContent(item);
    kitemsContainer.appendChild(kitem);
};
const reloadItem = item => {
    const kitem = document.querySelector(`.kitem[data-id='${item.id}']`);
    kitem.innerHTML = getKitemContent(item);
};

const addKitems = () => Object.values(kitems).forEach(addItem);

const bookItem = itemId => {
    fetch(`/kitem/book?item=${itemId}`, { method : 'post' })
        .then( response => {
            if(response.status === 200){
                kitems[itemId].booked = true;
                reloadItem(kitems[itemId]);
            }
        })
        .catch( err => console.error(err));
};

const buyItem = itemId => {
    fetch(`/kitem/buy?item=${itemId}`, { method : 'post' })
        .then( response => {
            console.log(response);
            kitems[itemId].bought = true;
            reloadItem(kitems[itemId]);
        })
        .catch( err => console.error(err));
};

const participate = itemId => {
    modal('foo', '<strong>Bar</strong').open();
};

const kitemActions = () => {

    kitemsContainer.addEventListener('click', e => {
        if(e.target){
            if(e.target.matches('.book')) {
                e.preventDefault();
                bookItem(e.target.closest('.kitem').dataset.id);
            }
            if(e.target.matches('.buy')) {
                e.preventDefault();
                buyItem(e.target.closest('.kitem').dataset.id);
            }
            if(e.target.matches('.participate')) {
                e.preventDefault();
                participate(e.target.closest('.kitem').dataset.id);
            }
        }
    });
};

const listDetails = list => {
    document.querySelector('body > header > h2').textContent = list.name;
    document.querySelector('main .details').textContent = list.desc;
};

const getListName = () => {
    const  paths =
        document.location.pathname
            .split('/')
            .filter( p => p && p.trim().length );
    if(paths && paths.length > 0){
        return paths[0];
    }
    return false;
};

const loadList = () => {
    const name = getListName();
    if(name){
        fetch(`/klist/${name}`)
            .then( result => result.json())
            .then( list => {
                if(list && list.id){
                    listDetails(list);
                    kitemActions(list.id);
                    return fetch(`/kitems?list=${list.id}`).then( result => result.json());
                }
            })
            .then( items => {
                if(items.length){
                    items.forEach( item => kitems[item.id] = item);
                    addKitems();
                }
            })
            .catch( err => console.error(err));
    }
};

loadList();
