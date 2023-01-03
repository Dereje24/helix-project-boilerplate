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
  selector: 'a,img',
};

export function getRandomId() {
  return Math.random().toString(16).slice(2);
}

export function toElementId(str) {
  return str.toLowerCase()
    .replace(/(\[\w+="(.*)"\]|:contains\("(.*)"\))/g, (all, g1, g2, g3) => ` ${(g2 || g3).replace(/\W+/g, '-')}`)
    .replace(/\s/g, '--').replace(/\./g, '-').replace(/-{2,}/g, '--').replace(/(^-+|-+$)/g, '');
}

export function generateUniqueSelector(el) {
  let selector = el.nodeName.toLowerCase();
  if (el.alt) {
    selector += `[alt="${el.alt.trim()}"]`
  } else if (el.title) {
    selector += `[title="${el.title.trim()}"]`
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

export function updateOverlay(elOverlay, el) {
  const rect = el.getBoundingClientRect();
  const positionStyles = getPositionStyles(el);
  elOverlay.style.position = positionStyles ? positionStyles.position : 'absolute';
  elOverlay.style.zIndex = positionStyles ? Math.max(0, Number(positionStyles.zIndex)) : null;

  const offset = elOverlay.style.position === 'fixed' ? { top: 0, left: 0 } : { top: window.scrollY, left: window.scrollX };
  elOverlay.style.left = `${offset.left + rect.left}px`;
  elOverlay.style.top = `${offset.top + rect.top}px`;
  elOverlay.style.width = `${rect.width}px`;
  elOverlay.style.height = `${rect.height}px`;

  const hue = 255 * (1 - elOverlay.dataset.value);
  elOverlay.style.backgroundColor = `hsla(${hue} 100% 50% / 50%)`;
  elOverlay.style.borderColor = `hsl(${hue} 100% 50%)`;
  elOverlay.firstElementChild.textContent = `${(Number(elOverlay.dataset.value) * 100).toFixed(2)}%`;
}

export function decorateOverlay(el, container) {
  if (!el.id) {
    el.id = toElementId(generateUniqueSelector(el));
  }
  let elOverlay = container.querySelector(`[data-target="${el.id}"]`);
  if (!elOverlay) {
    const overlayId = `overlay-${getRandomId(el)}`;
    elOverlay = document.createElement('div');
    elOverlay.setAttribute('id', overlayId);
    elOverlay.dataset.target = el.id;
    container.appendChild(elOverlay);

    elOverlay.dataset.value = Math.random();
    const label = document.createElement('span');
    elOverlay.append(label);
  }
  updateOverlay(elOverlay, el);
}

export function decorateOverlays(doc, options) {
  let container = document.querySelector('.heatmap-overlays');
  if (!container) {
    container = document.createElement('div');
    container.classList.add('heatmap-overlays');
    document.body.appendChild(container);
  }

  doc.querySelectorAll(options.selector).forEach((el) => decorateOverlay.call(this, el, container));

  // Decorate nodes whose visibility changed
  const visibilityChangeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      decorateOverlay.call(this, el, container);
      const overlay = container.querySelector(`[data-target="${el.id}"]`);
      overlay.style.display = entry.isIntersecting ? 'flex' : 'none';
    });
  });

  // Decorate nodes added asynchronously
  const addedNodesObserver = new MutationObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.type === 'attributes') {
        entry.target.querySelectorAll(options.selector).forEach((el) => {
          decorateOverlay.call(this, el, container);
        });
      }
      entry.addedNodes.forEach((n) => {
        n.querySelectorAll(options.selector).forEach((el) => {
          decorateOverlay.call(this, el, container);
          visibilityChangeObserver.observe(el);
        });
        // SVG icons might have custom sizes that modify the parent
        if (n.nodeName === 'svg') {
          const parent = n.closest(options.selector);
          if (!parent) {
            return;
          }
          decorateOverlay.call(this, parent, container);
        }
      })
    });
  });
  document.querySelectorAll('header,main,footer').forEach((el) => {
    addedNodesObserver.observe(el, { childList: true, subtree: true, attributes: true });
  });
}

export function postLazy(doc, options = {}) {
  this.loadCSS(`${options.basePath}/heatmap.css`);

  const config = { ...DEFAULT_OPTIONS, ...options };
  decorateOverlays.call(this, document, config);
  window.addEventListener('resize', () => {
    window.requestAnimationFrame(() => decorateOverlays.call(this, document, config));
  });

  const overlay = document.querySelector('.heatmap-overlays')
  overlay.style.display = 'none';

  const btn = this.plugins.preview.createToggleButton('Heatmap');
  btn.classList.add('hlx-heatmap-toggle');
  this.plugins.preview.getOverlay().append(btn);
  btn.addEventListener('click', () => {
    overlay.style.display = btn.getAttribute('aria-pressed') === 'true'
      ? 'block'
      : 'none';
  });
}
