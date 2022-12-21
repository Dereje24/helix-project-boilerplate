/**
 * Decorates all images and links.
 * @param {Element} $main The container element
 */
function getId() {
  return Math.random().toString(16).slice(2);
}

export const DEFAULT_OPTIONS = {
  selector: 'img,a',
};

export function updateOverlay(el) {
  const { overlayId } = el.dataset;
  const elOverlay = document.getElementById(overlayId);

  const rect = el.getBoundingClientRect();
  elOverlay.style.position = 'absolute';
  elOverlay.style.height = `${rect.height}px`;
  elOverlay.style.width = `${rect.width}px`;
  elOverlay.style.left = `${window.scrollX + rect.left}px`;
  elOverlay.style.top = `${window.scrollY + rect.top}px`;
  elOverlay.style.backgroundColor = `hsla(${255 * (1 - elOverlay.dataset.value)}, 100%, 50%, .5)`;
  elOverlay.style.borderColor = `hsl(${255 * (1 - elOverlay.dataset.value)}, 100%, 50%)`;
  elOverlay.firstElementChild.textContent = `${(elOverlay.dataset.value * 100).toFixed(2)}%`;
}

export function decorateOverlay(el, container) {
  let { overlayId } = el.dataset;
  if (!overlayId) {
    overlayId = `overlay-${getId()}`;
    const elOverlay = document.createElement('div');
    elOverlay.setAttribute('id', overlayId);
    container.appendChild(elOverlay);
    el.dataset.overlayId = overlayId;

    elOverlay.dataset.value = Math.random();
    const label = document.createElement('span');
    elOverlay.append(label);
  }
  updateOverlay(el);
}

export function decorateOverlays(doc) {
  let container = document.getElementById('heatmap-overlays');
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('id', 'heatmap-overlays');
    document.body.appendChild(container);
  }

  doc.querySelectorAll('a,img').forEach((el) => decorateOverlay(el, container));
}
