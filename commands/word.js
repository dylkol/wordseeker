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

//function createEmbedsForEtymology(data, index) {
//    const etymologyObj = data.etymologies[index];
//    etymologyStr = etymologyObj.etymology
//    let chunks = []
//    for (let i = 0; let total = etymologyStr.length; i < total; i += EMBED_FIELD_LENGTH) 
//        chunks.push(etymologies.substr(i, i + EMBED_FIELD_LENGTH));
//    chunks = 
//}

function createEmbed(data, index) {
    const etymologyObj = data.etymologies[index];

    var etymologyVal = "";
    var pronunciationsVal = "";

    //Check if not empty
    if (!etymologyObj.etymology)
        etymologyVal = "empty"
    else
        etymologyVal = etymologyObj.etymology.toEmbedString().substring(0, EMBED_FIELD_LENGTH)

    if (!etymologyObj.pronunciations || etymologyObj.pronunciations == '') 
        pronunciationsVal = "empty"
    else
        pronunciationsVal = etymologyObj.pronunciations
        
    console.log(`Etymology: ${etymologyVal}`);
    console.log(`Pronunciation: ${pronunciationsVal}`);

    const embed = new Discord.MessageEmbed()
    .setTitle(data.word)
    .setURL(data.link)
    .setDescription(etymologyObj.type)
    .addFields(
        { name: 'Etymology', value: etymologyVal },
        { name: 'Pronunciations', value: pronunciationsVal },
    )
    .setFooter(`Source: ${data.source}\n${index + 1}/${data.etymologies.length}`);
    return embed;
}

// Go through different etymologies for same word using react arrows.
async function navigationLoop(message, wikObj) {
    let index = 0;
    let first = true;
    let embed = createEmbed(wikObj, 0);
    let response = await message.channel.send(embed); 
    let leftReact;
    let rightReact;
    if (wikObj.etymologies.length > 1) { 
        while (true) {
            if (!first) {
                await response.reactions.removeAll();
                embed = createEmbed(wikObj, index);
                response = await response.edit(embed);
            } else first = false; 
            let added = [];
            if (index !== 0) { 
                let leftReact = await response.react(LEFT);
                added.push(LEFT);
            } if (index !== wikObj.etymologies.length - 1) {
                let rightReact = await response.react(RIGHT);
                added.push(RIGHT);
            }

            let collected = await response.awaitReactions((reaction, user) => {
                return added.includes(reaction.emoji.name) && user.id === message.author.id;
            }, { max: 1, time: 180000, errors: ['time'] });
            collected.first().emoji.name === LEFT ? index-- : index++
        }
    }
}
