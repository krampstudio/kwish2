import 'whatwg-fetch';
import confirmComponent from './components/confirm.js';

const kitems = {};

const kitemsContainer = document.querySelector('.kitems');

const getKitemContent = item => {
    let content  = `
                <div class="headmage">
                        <a href="${item.url}" target="_blank">
                            <img src="${item.image}" alt="${item.name}">
                        </a>
                    </div>
                    <h2>${item.name}</h2>
                    <div class="warn">
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
                        <li><a href="${item.url}" target="_blank" ><span class="icon icon-globe"></span> Site web</a></li>`;
            if(!item.fundOnly){
                content += `
                        <li><a href="#" class="book"><span class="icon icon-lock"></span> Réserver</a></li>
                        <li><a href="#" class="buy"><span class="icon icon-credit-card"></span> Acheter</a></li>`;
            }
                content += `<li><a href="#" class="participate"://www.leetchi.com/c/naissance-de-b-chevrier-boquet" class="participate"><span class="icon icon-squirrel"></span> Participer</a></li>
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
    confirmComponent('Veuiller confirmer la réservation', 'Une fois confirmé, l\'article ne sera plus accessible', modalElt => {
        const comment = modalElt.querySelector('textarea[name=comment]');
        fetch(`/kitem/book?item=${itemId}`, {
            method : 'POST',
            body : JSON.stringify({
                comment : comment.value
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then( response => {
            if(response.status === 200){
                kitems[itemId].booked = true;
                reloadItem(kitems[itemId]);
            }
        })
        .catch( err => console.error(err));
    }).open();
};

const buyItem = itemId => {
    confirmComponent('Veuiller confirmer l\'achat', 'Une fois confirmé, l\'article ne sera plus accessible', modalElt => {
        const comment = modalElt.querySelector('textarea[name=comment]');
        fetch(`/kitem/buy?item=${itemId}`, {
            method : 'POST',
            body : JSON.stringify({
                comment : comment.value
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then( response => {
            if(response.status === 200){
                kitems[itemId].bought = true;
                reloadItem(kitems[itemId]);
            }
        })
        .catch( err => console.error(err));
    }).open();
};

const participate = itemId => {
    confirmComponent('Vous souhaitez participer ?', 'Vous serez redirigé sur notre cagnotte Leetchi.', () => {
        window.open('https://www.leetchi.com/c/naissance-de-b-chevrier-boquet', '_blank');
    }).open();
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
    document.querySelector('body > header > h1').textContent = list.title;
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
    const name = getListName() || 'berem2';
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
