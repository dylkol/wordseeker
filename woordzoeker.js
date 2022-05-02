'use strict' 

// setup
require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();

// retrieve commands from files 
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.login(process.env.TOKEN);

const prefix = '?';
client.on('message', message => {
    if (message.content.startsWith(prefix)) {
        // remove prefix and separate arguments and the name of the command 
        const args = message.content.slice(prefix.length).trim().split(/\s+/).map((arg) => arg.trim());
        const commandName = args.shift().toLowerCase();

        // check if command exists in collection, if so, execute it
        if (!client.commands.has(commandName)) return;

        const command = client.commands.get(commandName);

        try {
            if (command.min_args && args.length < command.min_args) {
                if (command.usage) {
                    message.channel.send(`Not enough arguments. Usage: ${command.usage}`);
                } else {
                    message.channel.send(`Not enough arguments.`);
                }
            }
            command.execute(message, args);
        } catch (error) {
            console.error(error);
        }
    }
});
