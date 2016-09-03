


var query = < (selector: string) => Element>document.querySelector.bind(document);
var mapElm = query('.map');
var locationElm = query('.js-location');

locationElm.className += ' clickable';

locationElm.addEventListener('click', () => {
    mapElm.setAttribute('style', '');
})

mapElm.addEventListener('click', () => {
    mapElm.setAttribute('style', 'visibility: hidden');
});