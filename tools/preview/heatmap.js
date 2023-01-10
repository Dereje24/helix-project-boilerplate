/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// Default options for the plugin
export const DEFAULT_OPTIONS = {
  overlayClass: 'hlx-heatmap-overlay',
  rootSelector: 'body > :is(header,main,footer)',
  selector: 'a,[tabindex="0"]',
  source: 'franklin-rum',
};

// Generates the random ids for the individual zones
export function getRandomId() {
  return Math.random().toString(16).slice(2);
}

// Converts the selector generated below to a useable DOM id
// TODO: this needs to be extracted to the scripts.js so links are properly instrumented upstream
// before they actually send RUM/analytics events
export function toElementId(str) {
  return str.toLowerCase()
    .replace(
      /(\[[\w-]+="([^"]*)"\]|:contains\("(.*)"\))/g,
      (all, g1, g2, g3) => ` ${(g2 || g3).replace(/\W+/g, '-')}`,
    )
    .replace(/\s/g, '--')
    .replace(/\./g, '-')
    .replace(/-{2,}/g, '--')
    .replace(/(^-+|-+$)/g, '');
}

// Used to make sure every instrumented element that triggers the metrics has a (semi-)unique
// selector that we can use to generate an identifier (above)
// TODO: this needs to be extracted to the scripts.js so links are properly instrumented upstream
// before they actually send RUM/analytics events
export function generateSelector(el, suffix = '') {
  if (!el) {
    return suffix;
  }

  if (el.classList.contains('section')) { // add the section context classes
    const classes = [...new Set(el.classList)].filter((c) => c !== 'section');
    return classes.length ? `.${classes.join('.')} ${suffix}` : suffix;
  }
  if (el.classList.contains('block')) { // add the block context classes
    const classes = [...new Set(el.classList)].filter((c) => c !== 'block');
    return generateSelector(el.parentElement.closest('.section,main>div'), classes.length ? `.${classes.join('.')} ${suffix}` : suffix);
  }
  if (el.getAttribute('aria-role') && suffix) { // add any relevant intermediary accessibility element
    return generateSelector(el.parentElement.closest('[aria-role],.block,.section,main>div'), `[aria-role="${el.getAttribute('aria-role')}"] ${suffix}`);
  }
  if (suffix) {
    return suffix;
  }

  // Elements usually either have a link, or they have classes indicating their purpose
  let selector = el.nodeName.toLowerCase();
  if (el.href) {
    selector += `[href="${el.getAttribute('href')}"]`;
  } else if (el.classList.length) {
    selector += `.${[...new Set(el.classList)].filter((c) => c !== 'button').join('.')}`;
  }

  // To increase specificity, we also add whatever serves as relevant "text" for the element
  // TODO: maybe consider refactoring this so we don't fully depend on the exact text since this
  // prevents experimenting on the typo for the element without having analytics seeing a different
  // element in the end
  if (el.alt) {
    selector += `[alt="${el.alt.trim()}"]`;
  } else if (el.title) {
    selector += `[title="${el.title.trim()}"]`;
  } else {
    let content;
    if (el.firstElementChild) {
      content = [...el.children].filter((c) => c.nodeType === Node.TEXT_NODE).map((c) => c.textContent.trim()).join(' ');
    } else {
      content = el.textContent.trim();
    }
    if (content) {
      selector += `:contains("${content}")`;
    }
  }
  return generateSelector(el.parentElement.closest('[aria-role],.block,.section,main>div'), selector);
}

// Get the CSS positioning and z-index to properly position the heatmap zone
export function getPositionStyles(el) {
  let parent = el.offsetParent;
  if (!parent) {
    return null;
  }
  let style;
  while (parent) {
    style = getComputedStyle(parent);
    if (style.zIndex !== 'auto') {
      return {
        position: style.position,
        zIndex: style.zIndex,
      };
    }
    parent = parent.offsetParent;
  }
  return null;
}

// Returns the zone for the specified element
function getZone(el, container = document) {
  return container.querySelector(`[data-target="${el.id}"]`);
}

// Update the positioning of the specified zone
export function updateZone(zone) {
  if (!zone) {
    return null;
  }
  const el = document.getElementById(zone.dataset.target);
  const rect = el.getBoundingClientRect();
  const positionStyles = getPositionStyles(el);
  zone.style.position = positionStyles ? positionStyles.position : 'absolute';
  zone.style.zIndex = positionStyles ? Math.max(0, Number(positionStyles.zIndex)) : null;

  const offset = zone.style.position === 'fixed' ? { top: 0, left: 0 } : { top: window.scrollY, left: window.scrollX };
  zone.style.left = `${offset.left + rect.left}px`;
  zone.style.top = `${offset.top + rect.top}px`;
  zone.style.width = `${rect.width}px`;
  zone.style.height = `${rect.height}px`;

  const hue = 255 * (1 - zone.dataset.value);
  zone.style.backgroundColor = `hsla(${hue} 100% 50% / 50%)`;
  zone.style.borderColor = `hsl(${hue} 100% 50%)`;
  zone.firstElementChild.textContent = `${(Number(zone.dataset.value) * 100).toFixed(2)}%`;
  return zone;
}

// Create a zone for the specified element
export async function createZone(el, container, options) {
  if (!el.id) {
    const selector = generateSelector(el);
    el.id = toElementId(selector);
  }
  let zone = getZone(el, container);
  if (zone) {
    return zone;
  }
  const overlayId = `zone-${getRandomId(el)}`;
  zone = document.createElement('div');
  zone.setAttribute('id', overlayId);
  zone.dataset.target = el.id;
  container.append(zone);

  zone.dataset.value = await options.metricsProvider.getZoneMetrics(el.id);
  const label = document.createElement('span');
  zone.append(label);

  return updateZone(zone);
}

// Update all the heatmap zones at once
export async function updateHeatmap(container, overlay, options) {
  window.requestAnimationFrame(() => {
    container.querySelectorAll(options.selector).forEach((el) => updateZone(getZone(el, overlay)));
  });
}

// Creates the heatmap overlay, and all the zones in it.
// Also watches for DOM changes so we dynamically update zones as needed
export function createHeatmap(doc, options) {
  // Create the overlay element and hide it by default
  let container = doc.querySelector(`.${options.overlayClass}`);
  if (!container) {
    container = doc.createElement('div');
    container.classList.add(options.overlayClass);
    doc.body.appendChild(container);
  }
  container.style.display = 'none';

  // Add all the zones
  window.requestAnimationFrame(async () => {
    doc.querySelectorAll(`${options.rootSelector} :is(${options.selector})`).forEach(async (el) => {
      createZone(el, container, options);
    });
  });

  // Update zones when their matching elements toggle visibility (like when toggling menus)
  const visibilityChangeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      window.requestAnimationFrame(async () => {
        let zone = getZone(entry.target, container);
        if (!zone) {
          zone = await createZone(entry.target, container, options);
        } else {
          updateZone(zone);
        }
        zone.style.display = entry.isIntersecting ? 'flex' : 'none';
      });
    });
  });

  // Create/update zones for element added/updated asynchronously
  // (i.e. those added in async blocks like header/footer/etc.)
  const addedNodesObserver = new MutationObserver((entries) => {
    entries.forEach((entry) => {
      window.requestAnimationFrame(async () => {
        // If the attributes (class, etc.) changed, we likely need to update the zone positioning
        if (entry.type === 'attributes') {
          entry.target.querySelectorAll(options.selector).forEach((el) => {
            updateZone(getZone(el, container));
          });
        }
        entry.addedNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) {
            return;
          }
          if (n.matches(options.selector)) { // if the node itself matches the targeted ones
            createZone(n, container, options);
            visibilityChangeObserver.observe(n);
          } else { // if any of its children is
            n.querySelectorAll(options.selector).forEach((el) => {
              createZone(el, container, options);
              visibilityChangeObserver.observe(el);
            });
          }
          // SVG icons might have custom sizes that modify the parent
          if (n.nodeName === 'svg') {
            const parent = n.closest(options.selector);
            if (!parent) {
              return;
            }
            updateZone(getZone(parent, container));
          }
        });
      });
    });
  });
  // Only watch for nodes in the header/main/footer so we don't unnecessarily instrument stuff
  // from the overlays themselves
  document.querySelectorAll(options.rootSelector).forEach((el) => {
    addedNodesObserver.observe(el, { childList: true, subtree: true, attributes: true });
  });

  // Update the zone positions if the window is resized
  window.addEventListener('resize', () => {
    window.requestAnimationFrame(() => updateHeatmap(doc, container, options));
  });

  return container;
}

// Creates the toggle button for the heatmaps
function decorateHeatmapToggleButton(btn, heatmapOverlay) {
  btn.classList.add('hlx-heatmap-toggle');
  btn.addEventListener('click', () => {
    heatmapOverlay.style.display = btn.getAttribute('aria-pressed') === 'true'
      ? 'block'
      : 'none';
  });
  return btn;
}

// The main entry point triggered at the end of the lazy phase
export async function postLazy(doc, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Load the related CSS
  this.loadCSS(`${options.basePath}/heatmap.css`);

  // Select the right metrics provider that will give us the analytics values
  let metricsProvider;
  switch (config.source) {
    case 'adobe-analytics':
      metricsProvider = await import('./metrics-provider-analytics.js');
      break;
    default:
      metricsProvider = await import('./metrics-provider-rum.js');
      break;
  }

  // Initialize the metrics provider so it fetches the data in the background
  await metricsProvider.init({ ...this, url: window.location.origin + window.location.pathname });

  // Create the heatmap overlay, with all the zones
  const heatmapOverlay = createHeatmap(doc, { ...config, metricsProvider });

  // Add a toggle button to enble/disable the heatmap overlay
  const { createToggleButton, getOverlay } = this.plugins.preview;
  const heatmapToggleButton = decorateHeatmapToggleButton(
    createToggleButton('Heatmap'),
    heatmapOverlay,
  );
  getOverlay().append(heatmapToggleButton);
}
