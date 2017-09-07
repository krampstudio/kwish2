

const modalFactory = function (title = '', content = '', buttons = [{ label : 'Ok', close : true, action : () => {} }]){

    const modalContainer = document.querySelector('body');

    const removePreviousModals = () => {
        const previousModals = modalContainer.querySelectorAll('.modal');
        if(previousModals.length){
            //[].forEach.call(previousModals, modal => modalContainer.removeChild(modal));
        }
    };

    const modal = {
        init() {
            const addModal = () => {

                const modalElt = document.createElement('div');
                modalElt.classList.add('modal');
                modalElt.innerHTML = `
                    <h1>${title}</h1>
                    <div>
                        ${content}
                    </div>
                    <div class="actions"></div>
                `;

                const actions = modalElt.querySelector('.actions');
                buttons.forEach( button => {
                    const buttonElt = document.createElement('button');
                    buttonElt.textContent = button.label;
                    if(button.close || button.action){
                        buttonElt.addEventListener('click', e => {
                            e.preventDefault();
                            if(button.close){
                                this.close();
                            }
                            if(typeof button.action === 'function'){
                                button.action.call();
                            }
                        });
                    }
                    actions.appendChild(buttonElt);
                });

                modalContainer.appendChild(modalElt);

                return modalElt;
            };

            const addOverlay     = () => {
                const overlays = modalContainer.querySelectorAll('.overlay');

                if(overlays.length === 0){
                    const overlay = document.createElement('div');
                    overlay.classList.add('overlay');
                    modalContainer.appendChild(overlay);
                    return overlay;
                }

                return overlays[0];
            };

            removePreviousModals();

            this.overlayElt = addOverlay();
            this.modalElt = addModal();

            return this;
        },

        open(){


            this.overlayElt.classList.add('active');
            this.modalElt.classList.add('active');

            return this;
        },

        close(){
            this.overlayElt.classList.remove('active');
            this.modalElt.classList.remove('active');

            return this;
        }
    };
    return modal.init();

};

export default modalFactory;
