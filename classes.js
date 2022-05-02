'use strict'

class WiktionarySection {
    constructor(nodes) {
        this.nodes = nodes;
    }
}

class Etymology extends WiktionarySection {
    toString() {
        return this.nodes.map(node => node.textContent).join('\n');
    }

    toEmbedString() {
        const new_nodes = [];
        this.nodes.forEach(node => {
            const new_node = node.cloneNode(true);
            new_node.querySelectorAll('.reference figure').forEach(elem => elem.remove()); // don't need citations and figures
            const links = new_node.querySelectorAll('a[rel="mw:WikiLink"]');
            for (const link of links) {
                link.textContent = `[${link.textContent}](${link.href})`; // format for embed links
            }
            new_nodes.push(new_node);
        });
        return new_nodes.map(node => node.textContent).join("\n");
    }
}

class Pronunciation extends WiktionarySection {
    getIPAS() {
        const qualifier_ipas = {};
        const qualifiers = pronunciationList.getElementsByClassName('qualifier-content'); // determines what type of pronounciation, e.g. UK, US, Northern German, etc
        for (const qualifier of qualifiers) {
            ipas = qualifier.parentNode.getElementsByClassName('IPA'); // get all the IPAs for qualifier
            qualifier_ipas[qualifier.textContent] = Array.from(ipas);
        }
        const all_ipas = Array.from(pronunciationList.getElementsByClassName('IPA'));   	
    }
}

module.exports = {
    Etymology,
    Pronunciation
};