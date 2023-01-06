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
export const DEFAULT_OPTIONS = {
  overlayClass: 'hlx-heatmap-overlay',
  selector: 'a,img',
  source: 'franklin-rum',
};

export function getRandomId() {
  return Math.random().toString(16).slice(2);
}

export function toElementId(str) {
  return str.toLowerCase()
    .replace(
      /(\[\w+="(.*)"\]|:contains\("(.*)"\))/g,
      (all, g1, g2, g3) => ` ${(g2 || g3).replace(/\W+/g, '-')}`,
    )
    .replace(/\s/g, '--')
    .replace(/\./g, '-')
    .replace(/-{2,}/g, '--')
    .replace(/(^-+|-+$)/g, '');
}

export function generateUniqueSelector(el) {
  let selector = el.nodeName.toLowerCase();
  if (el.alt) {
    selector += `[alt="${el.alt.trim()}"]`;
  } else if (el.title) {
    selector += `[title="${el.title.trim()}"]`;
  } else {
    selector += `:contains("${el.textContent.trim()}")`;
  }
  let node = el;
  while (node.parentElement) {
    if (node.classList.contains('block') || node.classList.contains('section') || node.classList.contains('button')) {
      const token = node.classList.length
        ? `.${[...node.classList].join('.')}`
        : node.nodeName.toLowerCase();
      selector = `${token} ${selector}`;
    }
    node = node.parentElement;
  }
  return selector;
}

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

function getZone(el, container = document) {
  return container.querySelector(`[data-target="${el.id}"]`);
}

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

export async function createZone(el, container, options) {
  if (!el.id) {
    el.id = toElementId(generateUniqueSelector(el));
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

export async function updateHeatmap(container, overlay, options) {
  container.querySelectorAll(options.selector).forEach((el) => updateZone(getZone(el, overlay)));
}

export function createHeamap(doc, options) {
  let container = document.querySelector(`.${options.overlayClass}`);
  if (!container) {
    container = document.createElement('div');
    container.classList.add(options.overlayClass);
    document.body.appendChild(container);
  }
  container.style.display = 'none';

  doc.querySelectorAll(options.selector).forEach(async (el) => {
    createZone(el, container, options);
  });

  // Decorate nodes whose visibility changed
  const visibilityChangeObserver = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      let zone = getZone(entry.target, container);
      if (!zone) {
        zone = await createZone(entry.target, container, options);
      } else {
        updateZone(zone);
      }
      zone.style.display = entry.isIntersecting ? 'flex' : 'none';
    });
  });

  // Decorate nodes added asynchronously
  const addedNodesObserver = new MutationObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.type === 'attributes') {
        entry.target.querySelectorAll(options.selector).forEach((el) => {
          updateZone(getZone(el, container));
        });
      }
      entry.addedNodes.forEach((n) => {
        n.querySelectorAll(options.selector).forEach((el) => {
          createZone(el, container, options);
          visibilityChangeObserver.observe(el);
        });
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
  document.querySelectorAll('body > :is(header,main,footer)').forEach((el) => {
    addedNodesObserver.observe(el, { childList: true, subtree: true, attributes: true });
  });
  return container;
}

function decorateHeatmapToggleButton(btn, heatmapOverlay) {
  btn.classList.add('hlx-heatmap-toggle');
  btn.addEventListener('click', () => {
    heatmapOverlay.style.display = btn.getAttribute('aria-pressed') === 'true'
      ? 'block'
      : 'none';
  });
  return btn;
}

export async function postLazy(doc, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  this.loadCSS(`${options.basePath}/heatmap.css`);

  let metricsProvider;
  switch (config.source) {
    default:
      metricsProvider = await import('./metrics-provider-rum.js');
      break;
  }

  await metricsProvider.init({ ...this, url: window.location.origin + window.location.pathname });

  const heatmapOverlay = createHeamap(doc, { ...config, metricsProvider });

  const { createToggleButton, getOverlay } = this.plugins.preview;
  const heatmapToggleButton = decorateHeatmapToggleButton(
    createToggleButton('Heatmap'),
    heatmapOverlay,
  );
  getOverlay().append(heatmapToggleButton);

  window.addEventListener('resize', () => {
    if (heatmapOverlay.style.display === 'none') {
      return;
    }
    window.requestAnimationFrame(() => {
      updateHeatmap(doc, heatmapOverlay, { ...config, metricsProvider });
    });
  });
}
