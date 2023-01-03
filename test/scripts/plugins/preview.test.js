/* eslint-disable no-unused-expressions */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { api, preLazy } from '../../../tools/preview/preview.js';

document.body.innerHTML = await readFile({ path: '../dummy.html' });
document.head.innerHTML = await readFile({ path: '../head.html' });

const context = {
  loadCSS: sinon.stub(),
};

describe('Preview overlay plugin', () => {
  before(async () => {
  });

  beforeEach(async () => {
  });

  describe('api', () => {
    describe('getOverlay', () => {
      it('returns the overlay element', () => {
        const el = api.getOverlay();
        expect(el).to.be.ok;
        expect(el.className).to.eql('hlx-preview-overlay');
      });
    });

    describe('createPopupButton', () => {
      it('creates a popup button for simple items', () => {
        const btn = api.createPopupButton('foo', 'bar', ['baz', 'qux']);
        expect(btn.className).to.eql('hlx-badge');
        expect(btn.querySelector('span').textContent).to.eql('foo');
        expect(btn.querySelector('.hlx-popup').classList.contains('hlx-hidden')).to.true;
        expect(btn.querySelector('.hlx-popup-header-label').textContent).to.eql('bar');
        expect(btn.querySelectorAll('.hlx-popup-item-label')[0].textContent).to.eql('baz');
        expect(btn.querySelectorAll('.hlx-popup-item-label')[1].textContent).to.eql('qux');
      });

      it('creates a popup button for complex items', () => {
        const btn = api.createPopupButton(
          'foo',
          {
            label: 'bar',
            description: '<strong>baz</strong>',
            actions: [{ label: 'qux', href: '#corge' }],
          },
          [{
            label: 'grault',
            description: '<em>garply</em>',
            actions: [{ label: 'waldo', href: '#fred' }],
          }],
        );
        expect(btn.className).to.eql('hlx-badge');
        expect(btn.querySelector('span').textContent).to.eql('foo');
        expect(btn.querySelector('.hlx-popup').classList.contains('hlx-hidden')).to.true;
        expect(btn.querySelector('.hlx-popup-header-label').textContent).to.eql('bar');
        expect(btn.querySelector('.hlx-popup-header-description').textContent).to.eql('baz');
        expect(btn.querySelector('.hlx-popup-header-actions .hlx-button').innerHTML).to.eql('<a href="#corge">qux</a>');
        expect(btn.querySelector('.hlx-popup-item-label').textContent).to.eql('grault');
        expect(btn.querySelector('.hlx-popup-item-description').textContent).to.eql('garply');
        expect(btn.querySelector('.hlx-popup-item-actions .hlx-button').innerHTML).to.eql('<a href="#fred">waldo</a>');
      });

      it('toggles the popup when the button is clicked', () => {
        const btn = api.createPopupButton('foo', 'bar', ['baz', 'qux']);
        expect(btn.querySelector('.hlx-popup').classList.contains('hlx-hidden')).to.true;
        btn.click();
        expect(btn.querySelector('.hlx-popup').classList.contains('hlx-hidden')).to.false;
      });
    });

    describe('createToggleButton', () => {
      it('creates a a simple toggle button', () => {
        const btn = api.createToggleButton('foo');
        expect(btn.className).to.eql('hlx-badge');
        expect(btn.getAttribute('aria-pressed')).to.eql('false');
        expect(btn.querySelector('span').textContent).to.eql('foo');
      });

      it('toggles the button state on click', () => {
        const btn = api.createToggleButton('foo');
        expect(btn.getAttribute('aria-pressed')).to.eql('false');
        btn.click();
        expect(btn.getAttribute('aria-pressed')).to.eql('true');
      });
    });
  });

  describe('preLazy', () => {
    it('adds the overlay to the page', async () => {
      await preLazy.call(context, null, { basePath: '' });
      expect(document.querySelector('.hlx-preview-overlay')).to.be.ok;
    });

    it('loads the preview overlay stylesheet', async () => {
      await preLazy.call(context, null, { basePath: '' });
      expect(context.loadCSS.called).to.be.true;
    });
  });
});
