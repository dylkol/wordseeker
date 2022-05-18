'use strict'

const wiktionary = require('../wiktionary.js');
const Discord = require('discord.js');
const LEFT = '⬅️';
const RIGHT = '➡️';
const EMBED_FIELD_LENGTH = 1024;

module.exports = {
    name: 'word',
    usage: '<word> <language>(optional, default English)',
    min_args: 1,
    description: 'Look up a definition and/or etymology of a word in a given language',
    execute : async (message, args) => {
        let lang = '';
        if (args.length === 1) lang = 'English';
        else {
            // Put underscores between multiple lang args, e.g. Middle English becomes Middle_English
            // Also do it for languages seperated by - (e.g. Serbo-Croatian)
            lang = capitalize(args.slice(1));
            lang = lang.join('_');
        }
        try {
            let wikObj = await wiktionary.retrieveObject(args[0], lang);
            await navigationLoop(message, wikObj);
        } catch (error) {
            if (error.message == undefined)
                console.error(error.message);
            else 
                message.channel.send(error.message);
        }
    }
};

function capitalize(strings) {
    let newStrings = [];
    for (const string of strings) {
        let newString = [];
        for (const splitDash of string.split('-')) {
            const newSplitString = splitDash[0].toUpperCase() + splitDash.slice(1);
            newString.push(newSplitString);
        }
        newString = newString.join('-');
        newStrings.push(newString);
    }
    return newStrings;
}


function createEmbed(data, etymologyIndex, posIndex, totalIndex, totalLength) {
    // Two separate indices to first refer to the etymology, and then different parts of speech within that etymology, which contain different definitions.
    const etymologyObj = data.etymologies[etymologyIndex];

    var etymologyVal = "";
    var pronunciationsVal = "";
    var partOfSpeechVal = "";


    //Check if not empty
    if (!etymologyObj.etymology)
        etymologyVal = "Not available.";
    else
        etymologyVal = etymologyObj.etymology.toEmbedString().substring(0, EMBED_FIELD_LENGTH);

    if (etymologyObj.pronunciations.length === 0) 
        pronunciationsVal = "Not available.";
    else
        // Since the pronunciations are formed from <li> elements under the Pronunciation header, the ones that do not match actual pronunciations form empty strings in the end,
        // so that's why they are removed.
        pronunciationsVal = etymologyObj.pronunciations.map(pronunciation => pronunciation.toEmbedString())
            .filter(text=> text !== '').join('\n').substring(0, EMBED_FIELD_LENGTH);
        if (pronunciationsVal === '') pronunciationsVal = 'Not available.';

    if (etymologyObj.partsOfSpeech.length === 0)
        partOfSpeechVal = "Part of speech not available.";
    else
        partOfSpeechVal = etymologyObj.partsOfSpeech[posIndex].toEmbedString().substring(0, EMBED_FIELD_LENGTH);

    //console.log(...etymologyObj);

    const embed = new Discord.MessageEmbed()
    .setTitle(data.word)
    .setURL(data.link)
    .setDescription(partOfSpeechVal)
    .addFields(
        { name: 'Etymology', value: etymologyVal },
        { name: 'Pronunciations', value: pronunciationsVal },
        
    )
    .setFooter(`Source: ${data.source}\n${totalIndex+1}/${totalLength}`);
    return embed;
}

async function navigationLoop(message, wikObj) {
    // Go through different etymologies and parts of speech for the same word using react emoji arrows.
    let etymologyIndex = 0;
    let posIndex = 0;
    let totalIndex = 0;
    let first = true;

    const etymologiesLength = wikObj.etymologies.length;
    let etymologyObj = wikObj.etymologies[etymologyIndex];
    let partsOfSpeechLength = etymologyObj.partsOfSpeech.length;

    // Sum lengths of all parts of speech arrays for each etymology.
    const totalLength = Math.max(1, wikObj.etymologies.map(etymologyObj => etymologyObj.partsOfSpeech.length).reduce((acc, curr) => acc + curr)); 

    let embed = createEmbed(wikObj, etymologyIndex, posIndex, totalIndex, totalLength);
    let response = await message.channel.send(embed);


    // Helper functions that will update either both indices or just the posIndex depending on the position.
    function decreaseIndex() {
        if (posIndex !== 0) {
            posIndex--;
        }
        else {
            etymologyIndex--;
            etymologyObj = wikObj.etymologies[etymologyIndex];
            partsOfSpeechLength = etymologyObj.partsOfSpeech.length;
            posIndex = partsOfSpeechLength-1;
        }
        totalIndex--;
    }
    function increaseIndex() {
        if (posIndex !== partsOfSpeechLength-1) {
            posIndex++;
        }
        else {
            etymologyIndex++;
            etymologyObj = wikObj.etymologies[etymologyIndex];
            partsOfSpeechLength = etymologyObj.partsOfSpeech.length;
            posIndex = 0;
        }
        totalIndex++;
    }

    if (etymologiesLength > 1 || partsOfSpeechLength > 1) { 
        while (true) {
            if (!first) {
                await response.reactions.removeAll();
                embed = createEmbed(wikObj, etymologyIndex, posIndex, totalIndex, totalLength);
                response = await response.edit(embed);
            } else first = false; 
            let added = [];
            if (etymologyIndex !== 0 || posIndex !== 0) { 
                await response.react(LEFT);
                added.push(LEFT);
            } if (etymologyIndex !== wikObj.etymologies.length - 1 || 
                  posIndex !== etymologyObj.partsOfSpeech.length - 1) {
                await response.react(RIGHT);
                added.push(RIGHT);
            }

            let collected = await response.awaitReactions((reaction, user) => {
                return added.includes(reaction.emoji.name) && user.id === message.author.id;
            }, { max: 1, time: 180000, errors: ['time'] });
            collected.first().emoji.name === LEFT ? decreaseIndex() : increaseIndex();
        }
    }
}
