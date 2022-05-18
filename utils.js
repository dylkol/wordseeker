'use strict'

function toLinkText(nodes) {
    // Convert <a> nodes to text containing links with markdown format
    const texts = [];
    const elements = Array.from(nodes).filter(node => node.nodeType == 1);
    for (const element of elements) {
        if (element.tagName == 'A')
            texts.push(`[${element.textContent}](${element.href})`);
        else
            texts.push(element.textContent);
    }

    return texts;
}

module.exports = {
    toLinkText
}