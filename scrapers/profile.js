const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getProfileData(tabId) {
  for (let i = 0; i < 8; i++) {
    const scriptResult = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        let name = null;
        const main = document.querySelector('main');


        if (main) {
          const profileUrl = window.location.pathname; // "/in/xxxx"

          name = Array.from(main.querySelectorAll('a[href*="/in/"] h2'))
            .map(el => el.innerText?.trim())
            .find(text => text && text.length > 3);
        }

        // headline
        let headline = 'N/A';
        if (main) {
          const paragraphs = main.querySelectorAll('p');

          for (const p of paragraphs) {
            const text = p.innerText?.trim();

            if (
              text &&
              text.length > 10 &&
              text.length < 120 &&
              !text.toLowerCase().includes('followers') &&
              !text.toLowerCase().includes('connections')
            ) {
              headline = text;
              break;
            }
          }
        }

        // company
        let company = 'N/A';
        if (main) {
          const buttons = main.querySelectorAll('[role="button"]');

          for (const btn of buttons) {
            const p = btn.querySelector('p');
            const text = p?.innerText?.trim();

            if (
              text &&
              !text.toLowerCase().includes('school') &&
              !text.toLowerCase().includes('university')
            ) {
              company = text;
              break;
            }
          }
        }

        return { name, headline, company };
      },
    });

    const data = scriptResult[0].result;

    console.log("SCRAPE ATTEMPT", i, data);

    if (data && data.name) return data;

    await sleep(500);
  }

  console.log("❌ FAILED TO SCRAPE PROFILE");

  return null;
}