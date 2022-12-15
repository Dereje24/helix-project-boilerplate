import {
  buildBlock,
  init,
  loadCSS,
  loadFooter,
  loadHeader,
} from './lib-franklin.js';
import { decorateOverlays } from './overlays.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here

function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  this.plugins.decorator.decorateButtons(main);
  this.plugins.decorator.decorateIcons(main);
  buildAutoBlocks(main);
}

/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  const main = doc.querySelector('main');
  if (main) {
    decorateMain.call(this, main);
  }
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}


// function decorateOverlays(doc) {
//   const main = doc.querySelector('main');

//   document.body.style.position = 'relative';

//   let container = document.getElementById('overlay');
//   if (!container) {
//     container = document.createElement('div');
//     container.setAttribute('id', 'overlay');
//     document.body.appendChild(container);
//   }

//   main.querySelectorAll('a,img').forEach((el) => {
//     // console.log('img', main.querySelectorAll('img'));
//     let { overlayId } = el.dataset;
//     let elOverlay;
//     if (!overlayId) {
//       overlayId = `overlay-${getId()}`;
//       elOverlay = document.createElement('div');
//       elOverlay.setAttribute('id', overlayId);
//       container.appendChild(elOverlay);
//       el.dataset.overlayId = overlayId;
//     } else {
//       elOverlay = doc.getElementById(overlayId);
//     }
//     if (main.querySelector('img')) {
//       elOverlay.setAttribute('class', 'imgClass');
//     }

//     const rect = el.getBoundingClientRect();
//     elOverlay.style.position = 'absolute';
//     elOverlay.style.height = rect.height + 'px';
//     elOverlay.style.width = rect.width + 'px';
//     elOverlay.style.left = window.scrollX + rect.left + 'px';
//     elOverlay.style.top = window.scrollY + rect.top + 'px';

//     const value = Math.random();
//     elOverlay.style.backgroundColor = `hsla(${255 * (1 - value)}, 100%, 50%, .5)`;
//     let label = elOverlay.firstElementChild;
//     if (!label) {
//       label = document.createElement('span');
//       elOverlay.append(label);
//     }
//     label.textContent = (value * 100).toFixed(2) + '%';
//   });
// }

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');

  const { hash } = window.location;
  const element = hash ? main.querySelector(hash) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadCSS(`${window.hlx.codeBasePath}/styles/overlays.css`);
  addFavIcon(`${window.hlx.codeBasePath}/styles/favicon.svg`);
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // load anything that can be postponed to the latest here
  import('./delayed.js');
}

init({
  loadEager,
  loadLazy,
  loadDelayed,
  lcpBlocks: LCP_BLOCKS,
});
