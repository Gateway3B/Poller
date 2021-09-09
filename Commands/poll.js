const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { polls, client } = require('../index.js');
const crypto = require('crypto');

module.exports = {
    name: 'poll',
    async execute(interaction) {
        poll(interaction);
    }
}

function poll(interaction)
{
    // validateTime(interaction)

    switch(interaction.options.getString('type') || 'standard')
    {
        case 'standard':
            initiateStandardPoll(interaction);
            break;
        
        case 'reverse':
            initiateReversePoll(interaction);
            break;

        case 'ranked':
            initiateRankedPoll(interaction);
            break;
    }
}

function initiateStandardPoll(interaction)
{
    const pollId = crypto.createHash('sha256', crypto.randomBytes(256).toString('base64')).update(interaciton.options.getString('title'));

    const embed = new MessageEmbed()
        .setColor(0x30972D)
        .setTitle(interaction.options.getString('title'));

    const buttonRows = [];
    buttonRows.push(new MessageActionRow());

    for(let i = 1; i <= 10; i++)
    {
        if(buttonRows[buttonRows.length - 1].components.length == 5)
            buttonRows.push(new MessageActionRow());

        const option = interaction.options.getString(`option_${i}`);
        if(option)
        {
            embed.addField(`Option ${i}`, option, false);

            buttonRows[buttonRows.length -1]
                .addComponents(
                    new MessageButton()
                        .setCustomId(`${pollId}${i}`)
                        .setLabel(`Option ${i}`)
                        .setStyle('PRIMARY')
                );
        }
    }

    polls.set(pollId, {interaction: interaction, votes: new Map()});

    const pollTime = validateTime(interaction);

    setTimeout(finalizePoll(interaction, pollId), pollTime);


    const filter = i => i.customId.substring(0, pollId.length) === pollId;

    const collector = interaction.channel.CreateMessageComponentCollector({ filter, time: pollTime});

    collector.option('collect', async i => {
        if(!polls.get(pollId).votes.has(i.user.id))
        {
            polls.get(pollId).votes.set(i.user.id, new Set().add(i.customId.substring(pollId.length)));
        }
        else
        {
            if(interaction.options.getBool('multiple_votes') || interaction.options.getString('type') === 'ranked')
            {
                polls.get(pollId).votes.get(i.user.id).add(i.customId.substring(pollId.length));
            }
            else
            {
                polls.get(pollId).votes.delete(i.user.id);
            }            
        }
    });

    interaction.reply({
        embeds: [embed],
        components: buttonRows
    });
}

function validateTime(interaction)
{

    let timeLimit;
    
    if(!(timeLimit = interaction.options.getString('time_limit')) || !timeLimit.test("^\d\d:\d\d$"))
        return 600000;


    if(60 <= timeLimit.substring(0, 2)
        || timeLimit.substring(0, 2) < 0)
    {
        return 600000;
    }

    if(24 < timeLimit.substring(3, 5) 
        || timeLimit.substring(3, 5)  < 0)
    {
        return 600000;
    }

    return (Number(timeLimit.substring(0, 2)) *  + Number(timeLimit.substring(3, 5)) * 60000) * 60000;
}
