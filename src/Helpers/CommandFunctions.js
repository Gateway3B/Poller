const fs = require('fs');
const {testGuildId} = require('../../config.json');

function registerCommands(client, directory) {
    // Get command json files.
    const commandJSONFiles = fs.readdirSync(`./src/${directory}`).filter(file => file.endsWith('.json'));

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

async function deleteCommands(client) {
    if(process.argv.slice(2)[0] === 'test') {
        const guild = client.guilds.cache.get(testGuildId);

        const promises = [];
        guild.commands.cache.forEach(command => {
            promises.push(guild.commands.delete(command.id));
        });

        await Promise.all(promises);
    } else {
        // const application = client.application;

        // const promises = [];
        // application.commands.cache.forEach(command => {
        //     promises.push(application.commands.delete(commandJSON));
        // });

        // await Promise.all(promises);
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

module.exports = { registerCommands, deleteCommands, fetchCommands }