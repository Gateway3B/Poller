const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { polls, client } = require('../index.js');
const crypto = require('crypto');

module.exports = {
    name: 'pollsettings',
    async execute(interaction, Settings) {
        pollsettings(interaction, Settings);
    }
}

async function pollsettings(interaction, Settings)
{
    const guildSettings = await Settings.findOne({guild: interaction.guild.id});

    if(interaction.options.length === 0)
    {
        const embed = formatSettings(interaction, guildSettings)
        interaction.reply({
            embeds: [embed]
        });

        return;
    }
    
    const options = interaction.options.data;

    const time = timeHandler(options);

    const updatedSetting = {
        guild: option(options, 'guild')??guildSettings['guild'],
        type: option(options, 'type')??guildSettings['type'],
        time_limit_hours: time[0]??guildSettings['time_limit_hours'],
        time_limit_minutes: time[1]??guildSettings['time_limit_minutes'],
        real_time_results: option(options, 'real_time_results')??guildSettings['real_time_results'],
        multiple_votes: option(options, 'multiple_votes')??guildSettings['multiple_votes'],
        role: option(options, 'role')??guildSettings['role']
    };

    await Settings.findOneAndUpdate({guild: interaction.guild.id}, updatedSetting, {upsert: true})
    
    const embed = formatSettings(interaction, updatedSetting)
    interaction.reply({
        embeds: [embed]
    });
}

function formatSettings(interaction, setting)
{
    const embed = new MessageEmbed()
        .setColor(0x30972D)
        .setTitle('Poll Settings');

    embed.addField('Type', setting['type'].charAt(0).toUpperCase() + setting['type'].slice(1), true);
    embed.addField('Time Limit', `${setting['time_limit_hours']} Hours-${setting['time_limit_minutes']} Minutes`, true);
    embed.addField('Real Time Results', setting['real_time_results']?'True':'False' , true);
    embed.addField('Multiple Votes', setting['multiple_votes']?'True':'False' , true);
    embed.addField('Minimum Role', `<@&${interaction.guild.roles.cache.get(setting['role']).id}>`, true);

    return embed;
}


function option(options, name)
{
    const option = options.find(option => option.name === name);
    return option?option.value:null;
}

function timeHandler(options)
{
    let hours = option(options, 'time_limit_hours');
    let minutes = option(options, 'time_limit_minutes');

    if(!hours && !minutes)
    {
        return [hours, minutes];
    }

    if(hours <= 0 && minutes <= 0)
    {
        hours = 0;
        minutes = 10;
    }

    if(hours > 24)
    {
        hours = 24;
        mintues = 0;
    }

    if(minutes >= 60)
    {
        minutes = 59;
    }

    if(minutes < 0)
    {
        mintues = 0;
    }

    if(hours <= 0)
    {
        hours = 0;
    }

    return [hours, minutes];
}