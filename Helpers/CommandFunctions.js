const fs = require('fs');
const { testGuildId } = require('../config.json');

function registerCommands(client, directory) {
    // Get command json files.
    const commandJSONFiles = fs.readdirSync(`./${directory}`).filter(file => file.endsWith('.json'));

    // For each JSON set a command using it.
    for(const file of commandJSONFiles) {

        const commandJSON = require(`../${directory}/${file}`);

        if(process.argv.slice(2)[0] === 'test') {
            // Only set for one guild, instead of globaly, for faster updating.
            client.guilds.cache.get(testGuildId)?.commands?.create(commandJSON);
        } else {
            client.application?.commands.create(commandJSON);
        }
    }
}

function deleteCommands(client, directory) {
    // Get command json files.
    const commandJSONFiles = fs.readdirSync(`./${directory}`).filter(file => file.endsWith('.json'));

    // For each JSON delete a command using it.
    for(const file of commandJSONFiles) {

        const commandJSON = require(`../${directory}/${file}`);
        
        if(process.argv.slice(2)[0] === 'test') {
            client.guilds.cache.get(testGuildId)?.commands.delete(commandJSON);
        } else {
            // client.application?.commands.delete(commandJSON);
        }
    }
}

function fetchCommands(client, directory) {
    // Get command files.
    const commandFiles = fs.readdirSync(`./${directory}`).filter(file => file.endsWith('.js'));

    // For each command file, register it with the discord client.
    for(const file of commandFiles) {
        const command = require(`../${directory}/${file}`);
        client.commands.set(command.name, command);
    }
}

module.exports = { registerCommands, deleteCommands, fetchCommands }