'use strict'

const wiktionary = require('../wiktionary.js');
const Discord = require('discord.js');
module.exports = {
    name: 'oldword',
    usage: '<oldword> <language>(optional, default English)',
    min_args: 1,
    description: 'Look up a definition and/or etymology of a word in a given language',
    execute(message, args) {
        let lang = '';
        if (args.length === 1) lang = 'English';
        else {
            // Put underscores between multiple lang args, e.g. Middle English becomes Middle_English
            // Also do it for languages seperated by - (e.g. Serbo-Croatian)
            lang = capitalize(args.slice(1));
            lang = lang.join('_');
            console.log(lang);
        }
        wiktionary.retrieve(args[0], lang)
        .then(result => message.channel.send(result.slice(0,2000))) //Character limit
        .catch(error => { 
            message.channel.send(error.message);
            console.error(error);
        });
    },
};

function capitalize(strings) {
    let newStrings = [];
    for (const string of strings) {
        let newString = string[0].toUpperCase();
        newString += string.slice(1);
        newStrings.push(newString);
    }
    return newStrings;
}
/*
function createEmbed(data,index) {
    const definitionObj = data.definitions[index];
    const embed = new Discord.MessageEmbed();
    .setTitle(data.word);
    .setDescription(definitionObj.type);
    .addFields(
        { name: 'Definition', value: definitionObj.definition },
        { name: 'Etymology', value: definitionObj.etymology },
        { name: 'Pronunciation', value: definitionObj.pronunciation },
    )
    .setFooter('Source', defintionObj.source);
    return embed;
}
*/
