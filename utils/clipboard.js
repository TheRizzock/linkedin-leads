// utils/clipboard.js

export function copyToClipboard(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // prevent scrolling
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');

    document.body.removeChild(textarea);

    return success;
  } catch (err) {
    console.error('CLIPBOARD ERROR:', err);
    return false;
  }
}