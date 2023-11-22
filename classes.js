'use strict'

const utils = require('./utils.js');


class Etymology {
    constructor(nodes) {
        this.nodes = nodes;
    }

    toString() {
        return this.nodes.map(node => node.textContent).join('\n');
    }

    toEmbedString() {
        const newNodes = [];
        this.nodes.forEach(node => {
            const newNode = node.cloneNode(true);
            newNode.querySelectorAll('.reference figure').forEach(elem => elem.remove()); // don't need citations and figures
            const linkNodes = newNode.querySelectorAll('a[rel="mw:WikiLink"]');
            // TODO: use util function
            for (const linkNode of linkNodes) {
                linkNode.textContent = `[${linkNode.textContent}](${linkNode.href})`; // format for embed links
            }
            newNodes.push(newNode);
        });
        return (newNodes.length > 0) ? newNodes.map(node => node.textContent).join("\n") : 'Not available.';
    }
}

class Pronunciation {
    constructor(node) {
        this.ipas = Pronunciation.getIPAs(node);
        this.qualifiers = Pronunciation.getQualifiers(node);  // determines what type of pronounciation, e.g. UK, US, Northern German, etc
    }

    static getIPAs(entry) {
        const ipaNodes = [];
        let sibling = entry.children[0];

        // Iterate over sibilings to ensure no IPAs in children are retrieved (these can be things like homophones or rhymes which we don't want).
        while (sibling) {
            if (sibling.className == 'IPA')
                ipaNodes.push(sibling);
            sibling = sibling.nextElementSibling;
        }
        if (ipaNodes.length == 0)
            return [];
        return Array.from(ipaNodes).map(node => node.textContent);
    }

    static getQualifiers(entry) {
        const qualifierNodes = entry.getElementsByClassName('qualifier-content');
        if (qualifierNodes.length == 0)
            return [];
        const qualifierChildNodes = qualifierNodes[0].childNodes;
        return utils.toLinkText(qualifierChildNodes).filter(text => text != ','); // Filter out commas which are separate nodes
    }

    toEmbedString() {
        if (this.ipas.length == 0) 
            return '';

        let qualifierString = '';
        if (this.qualifiers.length == 0)
            qualifierString = 'General';
        else
            qualifierString = this.qualifiers.join(', ');

        return `${qualifierString}: ${this.ipas.join(', ')}`;
    }
}

class PartOfSpeech {
    constructor(node) {
        if (node) {
            this.pos = node.textContent; // The name of the part of speech is simply the element right under the header.
            let sibling = node.nextElementSibling;
            while (sibling && sibling.tagName !== 'OL')
                sibling = sibling.nextElementSibling; // Find nearest <ol> tag containing definitions.
            this.definitions = Array.from(sibling.children).map(defNode => defNode.textContent);
        }
        else {
            this.pos = '';
            this.definitions = [];
        }
    }

    toEmbedString() {
        return `${this.pos} \n \n ${this.definitions.map((def, index) => `${index+1}. ${def}`).join('\n')}`; // Add indices of ordered list.
    }
}

module.exports = {
    Etymology,
    Pronunciation,
    PartOfSpeech
};
