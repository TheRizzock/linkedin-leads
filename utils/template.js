// utils/template.js

export async function buildMessage(data) {
  const res = await fetch(chrome.runtime.getURL('template.txt'));
  let template = await res.text();


  return template
    .replace('{{firstName}}', data.first_name)
    .replace('{{company}}', data.company || '');
}

