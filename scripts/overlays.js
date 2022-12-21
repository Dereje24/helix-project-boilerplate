/**
 * Decorates all images and links.
 * @param {Element} $main The container element
 */
function getId() {
  return Math.random().toString(16).slice(2);
}

export function decorateOverlays(main) {
  // const main = doc.querySelector('main');

  document.body.style.position = 'relative';

  let container = document.getElementById('overlay');
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('id', 'overlay');
    document.body.appendChild(container);
  }

  main.querySelectorAll('a,img').forEach((el) => {
    let { overlayId } = el.dataset;
    let elOverlay;
    if (!overlayId) {
      overlayId = `overlay-${getId()}`;
      elOverlay = document.createElement('div');
      elOverlay.setAttribute('id', overlayId);
      container.appendChild(elOverlay);
      el.dataset.overlayId = overlayId;

      const value = Math.random();
      elOverlay.style.backgroundColor = `hsla(${255 * (1 - value)}, 100%, 50%, .5)`;
      let label = elOverlay.firstElementChild;
      if (!label) {
        label = document.createElement('span');
        elOverlay.append(label);
      }
      label.textContent = (value * 100).toFixed(2) + '%';
    } else {
      elOverlay = document.getElementById(overlayId);
    }
    if (main.querySelector('img')) {
      elOverlay.setAttribute('class', 'imgClass');
    }

    const rect = el.getBoundingClientRect();
    elOverlay.style.position = 'absolute';
    elOverlay.style.height = rect.height + 'px';
    elOverlay.style.width = rect.width + 'px';
    elOverlay.style.left = window.scrollX + rect.left + 'px';
    elOverlay.style.top = window.scrollY + rect.top + 'px';

  });
}