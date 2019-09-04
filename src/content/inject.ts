'use strict';

import { ElementPicker } from './element-picker';
import { Walk, walkDOM } from './walkdom';
import { Website } from './website';
import { Request } from '../utils/message';
import { load } from './loader';

window.onload = (): void => {
  var cryptFrame: HTMLIFrameElement | null;

  const picker = new ElementPicker(
    (selected: Element) => {
      walkDOM(
        selected,
        (childNode: Node): Walk => {
          if (childNode.textContent) {
            chrome.runtime.sendMessage(
              { request: 'debabbleText', data: childNode.textContent },
              (response: any): void => {} // TODO: we want to return if we successfully decrypted something
            );
          }
          return Walk.CONTINUE;
        }
      );
    },
    () => {
      chrome.runtime.sendMessage(
        { request: 'pickerStop', data: null },
        (response: any): void => {
          if (cryptFrame) {
            document.documentElement.removeChild(cryptFrame);
            cryptFrame = null; // ensure we don't keep the node in mem
          }
        }
      );
    }
  );

  const website: Website | null = load(window.location);
  if (website) {
    website.register();
  }

  chrome.runtime.onMessage.addListener(
    (
      request: Request,
      sender: chrome.runtime.MessageSender,
      sendResponse
    ): void => {
      if (request.requestClass === 'injectInput') {
        if (!website) {
          sendResponse({ success: false });
          return;
        }
        switch (request.request) {
          case 'tunnelCipherText':
            website.tunnelInput(request.data);
            break;
          case 'submitCipherText':
            website.submitInput();
            break;
          case 'clearInputBox':
            website.clearInput();
            break;
          default:
            break;
        }
        sendResponse({ success: true });
      } else if (request.request === 'activateElementPicker') {
        cryptFrame = document.createElement('iframe');
        cryptFrame.id = 'keur';
        cryptFrame.src = chrome.runtime.getURL('dist/html/decrypt.html');
        const pickerCSSStyle: string = [
          'background: transparent',
          'border: 0',
          'border-radius: 0',
          'box-shadow: none',
          'display: block',
          'height: 100%',
          'left: 0',
          'margin: 0',
          'max-height: none',
          'max-width: none',
          'opacity: 1',
          'outline: 0',
          'padding: 0',
          'position: fixed',
          'top: 0',
          'visibility: visible',
          'width: 100%',
          'pointer-events: none', // this lets us be the top layer and still highlight DOM nodes
          'z-index: 2147483647',
          ''
        ].join(' !important;');
        cryptFrame.style.cssText = pickerCSSStyle;
        // We don't append to the body because we are setting the frame's
        // width and height to be 100%. Prevents the picker from only being
        // able to hover the iframe.
        document.documentElement.appendChild(cryptFrame);
        picker.activate();
        sendResponse({ success: true });
      }
    }
  );
};
