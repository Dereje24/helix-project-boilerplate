import {
  buildBlock,
  init,
  loadCSS,
  loadFooter,
  loadHeader,
} from './lib-franklin.js';

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

function getId() {
  return Math.random().toString(16).slice(2);
}

function decorateOverlays(doc) {
  const main = doc.querySelector('main');

  document.body.style.position = 'relative';

  let container = document.getElementById('overlay');
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('id', 'overlay');
    container.style.top = 0;
    container.style.left = 0;
    container.style.width = '100%';
    container.style.height = '100%';
    document.body.appendChild(container);
  }

  main.querySelectorAll('a').forEach((links) => {
    let { overlayId } = links.dataset;
    let linksDiv;
    if (!overlayId) {
      overlayId = `overlay-${getId()}`;
      linksDiv = document.createElement('div');
      linksDiv.setAttribute('id', overlayId);
      linksDiv.setAttribute('class', 'linksDiv');
      container.appendChild(linksDiv);
      links.dataset.overlayId = overlayId;
    } else {
      linksDiv = doc.getElementById(overlayId);
    }
    const rect = links.getBoundingClientRect();
    // console.log('links positions', links);
    linksDiv.style.position = 'absolute';
    linksDiv.style.height = rect.height + 'px';
    linksDiv.style.width = rect.width + 'px';
    linksDiv.style.left = window.scrollX + rect.left + 'px';
    linksDiv.style.top = window.scrollY + rect.top + 'px';
    linksDiv.style.backgroundColor = 'rgba(21, 140, 244, 0.5)';
    let numData = linksDiv.firstElementChild;
    if (!numData) {
      numData = document.createElement('medium');
      linksDiv.append(numData);
    }
    numData.textContent = '15.2%';
  });

  // main.querySelectorAll('.button-container').forEach((buttons, i) => {
  // let rect = buttons.getBoundingClientRect();
  // const buttonsDiv = document.createElement('div');
  // buttonsDiv.setAttribute('id', 'buttonsDiv' + i);
  // buttonsDiv.setAttribute('class', 'buttonsDiv')
  // container.appendChild(buttonsDiv);
  // buttonsDiv.style.position = 'absolute';
  // buttonsDiv.style.height = rect.height + 'px';
  // buttonsDiv.style.width = rect.width + 'px';
  // buttonsDiv.style.left = rect.left + 'px';
  // buttonsDiv.style.top = rect.top + 'px';
  // buttonsDiv.style.backgroundColor = "rgba(246, 75, 75, 0.5)";
  // const numData = document.createElement('h2');
  // numData.insertAdjacentText('afterbegin', '6.25%');
  // buttonsDiv.append(numData);
  // })

  main.querySelectorAll('img').forEach((img) => {
    let { overlayId } = img.dataset;
    let imgDiv;
    if (!overlayId) {
      overlayId = `overlay-${getId()}`;
      imgDiv = document.createElement('div');
      imgDiv.setAttribute('id', overlayId);
      imgDiv.setAttribute('class', 'imgDiv');
      container.appendChild(imgDiv);
      img.dataset.overlayId = overlayId;
    } else {
      imgDiv = doc.getElementById(overlayId);
    }
    const rect = img.getBoundingClientRect();
    imgDiv.style.position = 'absolute';
    imgDiv.style.height = rect.height + 'px';
    imgDiv.style.width = rect.width + 'px';
    imgDiv.style.left = window.scrollX + rect.left + 'px';
    imgDiv.style.top = window.scrollY + rect.top + 'px';
    let numData = imgDiv.firstElementChild;
    if (!numData) {
      numData = document.createElement('h1');
      imgDiv.append(numData);
    }
    numData.textContent = '19.54%';
  });
}

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
