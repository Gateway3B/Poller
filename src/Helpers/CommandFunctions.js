const fs = require('fs');
const {testGuildId, discordBotToken} = require('../../config.json');

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

function registerCommands(client, directory) {
    // Get command json files.
    const commandJSONFiles = fs.readdirSync(`./src/${directory}`).filter(file => file.endsWith('.json'));

    // For each JSON set a command using it.
    for(const file of commandJSONFiles) {

        const commandJSON = require(`../${directory}/${file}`);

        if(process.argv.slice(3)[0] === 'test') {
            // Only set for one guild, instead of globaly, for faster updating.
            client.guilds.cache.get(testGuildId)?.commands?.create(commandJSON);
        } else {
            client.application?.commands.create(commandJSON);
        }
    }
}

async function deleteCommands(client) {
    if(process.argv.slice(3)[0] === 'test') {
        const guild = client.guilds.cache.get(testGuildId);
        const promises = [];

        const commands = await guild.commands.fetch();
        commands.forEach(command => {
            promises.push(guild.commands.delete(command.id));
        });
        
        await Promise.all(promises);
    } else {
        const application = client.application;

        const promises = [];
        const commands = await application.commands.fetch();
        commands.forEach(command => {
            promises.push(application.commands.delete(command.id));
        });

        await Promise.all(promises);
    }
}

function fetchCommands(client, directory) {
    // Get command files.
    const commandFiles = fs.readdirSync(`./src/${directory}`).filter(file => file.endsWith('.js'));

    // For each command file, register it with the discord client.
    for(const file of commandFiles) {
        const command = require(`../${directory}/${file}`);
        client.commands.set(command.name, command);
    }
}

async function createDelete(client)
{
    if(process.argv.slice(2)[0] === 'create')
    {
        registerCommands(client, 'CommandJSONs');
        process.exit();
    }
    if(process.argv.slice(2)[0] === 'delete')
    {
        await deleteCommands(client, 'CommandJSONs');
        process.exit();
    }
}

module.exports = { fetchCommands, createDelete }
