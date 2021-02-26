module.exports = {
    name: 'reload',
    min_args: 1,
    usage: 'reload <command>',
    execute(message, args) {
        const commandName = args[0].toLowerCase();
        const command = message.client.commands.get(commandName);

        if (!command) return message.channel.send(`No command called \`${commandName}\` exists.`);
        
        // Delete command from cache and reload it by putting it into the collection again
        delete require.cache[require.resolve(`./${command.name}.js`)];
        try {
            const newCommand = require(`./${command.name}.js`);
            message.client.commands.set(newCommand.name, newCommand);
            message.channel.send(`Command \`${command.name}\` was reloaded!`);
        } catch (error) {
            console.error(error);
            message.channel.send(`There was an error reloading the command \`${command.name}\`:\n\`${error.message}\``);
        }
    }
}
