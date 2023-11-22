'use strict' 

// setup
require('dotenv').config();
const { Collection, Client, Events, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const client = new Client( {intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.GuildMessageReactions,
	GatewayIntentBits.MessageContent,
	], });

// retrieve commands from files 
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	}
}

client.login(process.env.TOKEN);

/* New / usage */
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!' });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!' });
		}
	}
});

/* Old usage */
const prefix = '?';
client.on(Events.MessageCreate, message => {
    if (message.content.startsWith(prefix)) {
        // remove prefix and separate arguments and the name of the command 
        const args = message.content.slice(prefix.length).trim().split(/\s+/).map((arg) => arg.trim());
        const commandName = args.shift().toLowerCase();

        // check if command exists in collection, if so, execute it
        if (!client.commands.has(commandName)) return;

        const command = client.commands.get(commandName);

        try {
            if (command.old.min_args && args.length < command.old.min_args) {
                if (command.old.usage) {
                    message.channel.send(`Not enough arguments. Usage: ${command.usage}`);
                } else {
                    message.channel.send(`Not enough arguments.`);
                }
            }
            command.old.execute(message, args);
        } catch (error) {
            console.error(error);
        }
    }
});
