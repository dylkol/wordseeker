'use strict' 

const fetch = require('node-fetch');
const JSDOM = require('jsdom').JSDOM;
const classes = require('./classes.js');

const source = 'Wiktionary';
module.exports = {
    retrieveObject: async(word, lang) => {
        try {
            const { html, url } = await getHTMLPage(word, lang);
            const parsed = parseWiktionaryObject(html, url, lang);
            const link = lang.isProto ? 
                `https://en.wiktionary.org/wiki/${encodeURIComponent(`Reconstruction:${lang.language}/${word.replace('*', '')}`)}` :
                `https://en.wiktionary.org/wiki/${encodeURIComponent(word + `#${lang.language}`)}`;
            parsed.word = word;
            parsed.source = source;
            parsed.link = link;
            return parsed;
        } catch (error) {
            throw error;
        }
    }
}

const ver = '0.0.4';
const userAgent = `Wordseeker discord bot/${ver} (zuyderzee@protonmail.com) discord.js/12.0`;

async function getHTMLPage(word, lang) {
    try {
        let url = '';
        if (lang.isProto)
            // Reconstruction pages are quite different, with the language itself prefixed by "Reconstruction:" included in the URL.
            url = `https://en.wiktionary.org/w/rest.php/v1/page/${encodeURIComponent(`Reconstruction:${lang.language}/${word.replace('*', '')}`)}/html`;
        else
            url = `https://en.wiktionary.org/w/rest.php/v1/page/${encodeURIComponent(word)}/html`;
        
        const response = await fetch(url, 
        {'User-Agent': userAgent}
        );
        if (response.status === 404) throw new Error('Word not found.');
        else if (response.status !== 200) throw new Error(`Something went wrong retrieving Wiktionary data:\n` +
            `Error ${response.status}: ${response.statusText}`);
        const data = await response.text();
        return { 'html': data, 'url': url };
    } catch (error) {
        throw error;
    }
}

function parseWiktionaryObject(html, url, lang) {
    try {
        const doc = new JSDOM(html, { 'url': url }).window.document;
        // Parent of heading containing language id is the section describing the word in that language.
        const langElem = doc.getElementById(lang.language);
        if (!langElem) throw new Error('Word not found in that language. However, it is available in other languages.');
        const section = langElem.parentNode;
        const etymologies = parseEtymologies(section);
        return { 'etymologies': etymologies };
    } catch(error) {
        throw error;
    }
}

function parseEtymologies(node) {
    try {
        // Etymologies are stored in a section with an h3 tag with id starting with Etymology.
        const headers = node.querySelectorAll('h3[id^="Etymology"]');
        /* If no etymology found, the object structure is still based on etymology at the root.
         * Hence whatever is available (pronunciation, parts of speech, etc.) will still be inside 
         * an etymologies array in the object, but the etymology text will be null. */
        if (headers.length === 0) {
            const pronunciations = parsePronunciations(node);
            const partsOfSpeech = parsePartsOfSpeech(node, 0);
            return [ { 'etymology': null, 'pronunciations': pronunciations, 'partsOfSpeech': partsOfSpeech } ];
        } else {
            const etymologies = Array.from(headers).map((header, index) => {
                const nodes = [];
                let sibling = header.nextElementSibling;

                // Get all the section sibling tags
                while (sibling && sibling.tagName !== 'P') {
                    sibling = sibling.nextElementSibling;
                }
                
                while (sibling && sibling.tagName !== 'SECTION') {
                    nodes.push(sibling);
                    sibling = sibling.nextElementSibling;
                }

                const etymology = new classes.Etymology(nodes);

                const pronunciations = parsePronunciations(header.parentNode);
                const partsOfSpeech = parsePartsOfSpeech(header.parentNode);

                return { 'etymology': etymology, 'pronunciations': pronunciations, 'partsOfSpeech': partsOfSpeech};
            });
            return etymologies;
        }
    } catch (error) {
        throw error;
    }
}

function parsePartsOfSpeech(node) {
    const pos_headers = ['Adjective', 'Adverb', 'Ambiposition', 'Article', 'Circumposition', 'Classifier', 'Conjunction', 
        'Contraction', 'Counter', 'Determiner', 'Ideophone', 'Interjection', 'Noun', 'Numeral', 'Participle', 
        'Particle', 'Postposition', 'Preposition', 'Pronoun', 'Proper noun', 'Verb', 
        'Circumfix', 'Combining form', 'Infix', 'Interfix', 'Prefix', 'Root', 'Suffix',
        'Diacritical mark', 'Letter', 'Ligature', 'Number', 'Punctuation mark', 'Syllable', 'Symbol', 
        'Phrase', 'Proverb', 'Prepositional phrase', 'Han character', 'Hanzi', 'Kanji', 'Hanja',
        'Romanization', 'Logogram', 'Determinative']; // Possible part-of-speech headings according to https://en.wiktionary.org/wiki/Wiktionary:Entry_layout#Part_of_speech
        
    
    try {

        const headers = [];
        for (const pos of pos_headers) {
            const query = `[id^="${pos.replace(' ', '_')}"]`;
            headers.push(...Array.from(node.querySelectorAll(query)));
        }

        if (headers.length == 0) {
            // Sometimes the part of speech is defined outside the etymology it is the same for multiple etymologies, so we check the parent as well before giving up.
            for (const pos of pos_headers) {
                const query = `[id^="${pos.replace(' ', '_')}"]`;
                headers.push(...Array.from(node.parentNode.querySelectorAll(query)));
            }
            if (headers.length == 0) return [];
        }

        return headers.map(header => new classes.PartOfSpeech(header));
    }
    catch (error) {
        throw error;
    }

}

function parsePronunciations(node) {
    try {
        //Similar to etymologies, except there is always only one heading
        let header = node.querySelector('[id^="Pronunciation"]');
        if (!header) {
            // Sometimes pronunciation is defined above etymology if the pronunciation for multiple etymologies is the same, so we check the parent as well before giving up.
            header = node.parentNode.querySelector('[id^="Pronunciation"]');
            if (!header) return [];
        }
        const nodes = header.nextElementSibling.children;
        const pronunciations = Array.from(nodes).map(node => new classes.Pronunciation(node));
        return pronunciations;
    } catch (error) {
        throw error;
    }
}