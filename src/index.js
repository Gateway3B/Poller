const { Client, Intents, Collection } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.commands = new Collection();

const { discordBotToken, ATLASUSER, ATLASPASS } = require('../config.json');
const commandFunctions = require('./Helpers/CommandFunctions');

const mongoose = require('mongoose');
var conn;

// Poll Settings Schema
const pollSettingsSchema = new mongoose.Schema({
    guild: String,
    type: String,
    time_limit_hours: Number,
    time_limit_minutes: Number,
    real_time_results: Boolean,
    multiple_votes: Boolean,
    role: String
});
var PollSettings;



client.once('ready', async() => {
    console.log(`Logged in as ${client.user.tag}!`);

    const uri = `mongodb+srv://${ATLASUSER}:${ATLASPASS}@g3-cluster.8tlri.mongodb.net/POLLER?retryWrites=true&w=majority`;
    mongoose.connect(uri, {useNewUrlParser: true});
    conn = mongoose.connection;
    conn.on('error', console.error.bind(console, 'connection error:'));

    commandFunctions.fetchCommands(client, 'Commands');

    conn.collection('SETTINGS');
    PollSettings = mongoose.model('SETTINGS', pollSettingsSchema);

    const guildSearchPromises = client.guilds.cache.map(async(guild) => {
        const doc = await PollSettings.find({guild: guild.id});
        if(doc.length === 0)
            createDefaultSettings(guild.id);
    });

    await Promise.all(guildSearchPromises);
});


async function createDefaultSettings(guildId) {
    const settings = new PollSettings({
        guild: guildId,
        type: 'standard',
        time_limit_hours: 0,
        time_limit_minutes: 10,
        real_time_results: false,
        multiple_votes: false,
        role: client.guilds.cache.get(guildId).roles.cache.find(role => role.name === '@everyone').id
    });

    await settings.save();
}


// Slash command
client.on('interactionCreate', async interaction => {

    // Guards
    if(!interaction.isCommand()) return;
    if(!client.commands.has(interaction.commandName)) return;

    // Try executing command
    try {
        await client.commands.get(interaction.commandName).execute(interaction, PollSettings);
    } catch(err) {
        console.error(err);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }

});

client.login(discordBotToken);

process.on('SIGINT', async () => {
    console.log('Bot Shutdown');
    await client.destroy();
    process.exit(1);
});
