import { installNeuroportMotion } from './motion.js';
installNeuroportMotion({ hero: document.querySelector('[data-hero]'), track: document.querySelector('[data-section-navigation]') });
// Presentation-only controls: no page jumps, new tabs or outgoing URLs.
document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault()});
document.addEventListener('keydown',e=>{const a=e.target.closest('a[role="button"]');if(a&&(e.key==='Enter'||e.key===' ')){e.preventDefault();a.click()}});
const menuButton=document.querySelector('.menu-toggle'),menu=document.querySelector('#site-menu');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false')}
menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden))});
menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!menuButton.contains(e.target))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus()}});
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
document.querySelectorAll('[data-carousel]').forEach(button=>button.addEventListener('click',()=>{
 const rail=document.querySelector(`[data-carousel-track="${button.dataset.carousel}"]`),direction=Number(button.dataset.direction);
 if(rail.scrollWidth>rail.clientWidth+2)rail.scrollBy({left:direction*(rail.firstElementChild.getBoundingClientRect().width+16),behavior:reduced.matches?'instant':'smooth'});
 else if(direction>0)rail.append(rail.firstElementChild);else rail.prepend(rail.lastElementChild);
}));

if(!reduced.matches){const section=document.querySelector('.clinics');const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){section.querySelector('.clinic-heading').classList.add('clinic-reveal');section.querySelectorAll('.clinic-card').forEach((card,i)=>{card.style.animationDelay=(i*65)+'ms';card.classList.add('clinic-reveal')});observer.disconnect()}},{threshold:.15});observer.observe(section)}
