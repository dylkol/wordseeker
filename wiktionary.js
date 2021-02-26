'use strict' 

const fetch = require('node-fetch');
const JSDOM = require('jsdom').JSDOM;

const source = 'Wiktionary';
module.exports = {
    retrieve: async(word, lang) => {
        try {
            const html = await getHTMLPage(word);
            const parsed = parseWiktionary(html, lang);
            const source = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
            return `${parsed}\n\nSource: ${source}`;
        } catch (error) {
            throw error;
        }
    },
    retrieveObject: async(word, lang) => {
        try {
            const html = await getHTMLPage(word);
            const parsed = parseWiktionaryObject(html, lang);
            const link = `https://en.wiktionary.org/wiki/${encodeURIComponent(word + `#${lang}`)}`;
            parsed.word = word;
            parsed.source = source;
            parsed.link = link;
            return parsed;
        } catch (error) {
            throw error;
        }
    }
}

const ver = '0.0.2'

async function getHTMLPage(word) {
    try {
        const url = `https://en.wiktionary.org/w/rest.php/v1/page/${encodeURIComponent(word)}/html`;
        const response = await fetch(url, 
        {'User-Agent': `Woordzoeker discord bot/${ver} (dylkol@protonmail.com) discord.js/12.0`}
        );
        if (response.status === 404) throw new Error('Word not found.');
        else if (response.status !== 200) throw new Error(`Something went wrong retrieving Wiktionary data:\n` +
            `Error ${response.status}: ${response.statusText}`);
        const data = await response.text();
        return data;
    } catch (error) {
        throw error;
    }
}

function parseWiktionaryObject(html, lang) {
    try {
        const doc = new JSDOM(html).window.document;
        // Parent of heading containing language id is the section describing the word in that language.
        const langElem = doc.getElementById(lang);
        if (!langElem) throw new Error('Word not found in that language. However, it is available in other languages.');
        const section = langElem.parentNode;
        const etymologies = parseEtymologies2(section);
        return { 'etymologies': etymologies };
    } catch(error) {
        throw error;
    }
}
function parseWiktionary(html, lang) {
    try {
        const doc = new JSDOM(html).window.document;
        // Parent of heading containing language id is the section describing the word in that language.
        const langElem = doc.getElementById(lang);
        if (!langElem) throw new Error('Word not found in that language. However, it is available in other languages.');
        const section = langElem.parentNode;
        const etymologies = parseEtymologies(section);
        return etymologies;
    } catch(error) {
        throw error;
    }
}

// Etymologies are stored in a section with an h3 tag with id starting with Etymology.
function parseEtymologies(node) {
    try {
        const headers = node.querySelectorAll('h3[id^="Etymology"]');
        if (headers.length === 0) {
            throw new Error('Wiktionary etymology not available for this word.');
        }
        const etymologies = Array.from(headers).map(header => {
            let sibling = header.nextElementSibling;
            let etymologyText = '';
            while (sibling && sibling.tagName !== 'SECTION') {
                etymologyText += `${sibling.textContent}`;
                sibling = sibling.nextElementSibling;
                // more siblings so add newlines
                if (sibling && sibling.tagName !== 'SECTION') etymologyText += '\n\n'; 
            }
            return etymologyText;
        });
        if (etymologies.length > 1) {
            const init = 'Etymology 1\n';
            const result = etymologies.reduce((accum, current, index) => 
                accum += (index < etymologies.length - 1) ? `${current}\n\nEtymology ${index+2}\n` : current, 
                init);
            return result;
        } else {
            return etymologies[0];
        }
    } catch (error) {
        throw error;
    }
}

// Etymologies are stored in a section with an h3 tag with id starting with Etymology.
function parseEtymologies2(node) {
    try {
        const headers = node.querySelectorAll('h3[id^="Etymology"]');
        /* If no etymology found, the object structure is still based on etymology at the root.
         * Hence whatever is available (pronunciation, definition, etc.) will still be inside 
         * an etymologies array in the object, but the etymology text will be null. */
        if (headers.length === 0) { 
            const pronunciations = parsePronunciations(node);
            return [ { 'etymology': null, 'pronunciations': pronunciations } ];
        } else {
            const etymologies = Array.from(headers).map(header => {
                let sibling = header.nextElementSibling;
                let etymologyText = '';
                while (sibling && sibling.tagName !== 'SECTION') {
                    etymologyText += `${sibling.textContent}`;
                    sibling = sibling.nextElementSibling;
                    // more siblings so add newlines
                    if (sibling && sibling.tagName !== 'SECTION') etymologyText += '\n\n'; 
                }
                const pronunciations = parsePronunciations(header.parentNode);
                return { 'etymology': etymologyText, 'pronunciations': pronunciations};
            });
            return etymologies;
        }
    } catch (error) {
        throw error;
    }
}

//Similar to etymologies, except there is always only one heading
function parsePronunciations(node) {
    try {
        let header = node.querySelector('[id^="Pronunciation"]');
        if (!header) {
            // Sometimes pronunciation is defined above etymology if the pronunciation for multiple etymologies is the same
            header = node.parentNode.querySelector('[id^="Pronunciation"]');
            if (!header) return null;
        }

        let sibling = header.nextElementSibling;
        let pronunciationsText = '';
        while (sibling && sibling.tagName !== 'SECTION') {
            pronunciationsText += `${sibling.textContent}`;
            sibling = sibling.nextElementSibling;
            // more siblings so add newlines
            if (sibling && sibling.tagName !== 'SECTION') pronunciationsText += '\n\n'; 
        }
        console.log(pronunciationsText);
        return pronunciationsText;
    } catch (error) {
        throw error;
    }
}
