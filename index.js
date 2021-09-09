const { Client, Intents, Collection } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.commands = new Collection();

const { discordBotToken } = require('./config.json');
const commandFunctions = require('./Helpers/CommandFunctions');

const polls = new Map();

modeule.export({polls, client});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    commandFunctions.registerCommands(client, 'CommandJSONs');

    commandFunctions.fetchCommands(client, 'Commands');
});

// Slash command
client.on('interactionCreate', async interaction => {

    // Guards
    if(!interaction.isCommand()) return;
    if(!client.commands.has(interaction.commandName)) return;

    // Try executing command
    try {
        await client.commands.get(interaction.commandName).execute(interaction);
    } catch(err) {
        console.error(err);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }

});

client.login(discordBotToken);

process.on('SIGINT', async () => {
    console.log('Bot Shutdown');
    commandFunctions.deleteCommands(client, 'CommandJSONs');
    await client.destroy();
    process.exit(1);
});
