const { MessageEmbed, MessageActionRow, MessageButton, MessageAttachment, SnowflakeUtil, MessageFile } = require('discord.js');
const {PrimaryColor} = require('../../config.json');
const crypto = require('crypto');
const vega = require('vega');
const sharp = require('sharp');

module.exports = {
    name: 'poll',
    async execute(interaction, PollSettings) {
        poll(interaction, PollSettings);
    }
}


async function poll(interaction, PollSettings)
{
    const poll = {};
    poll.interaction = interaction;
    poll.guildSettings = await PollSettings.findOne({guild: poll.interaction.guild.id});
    poll.pollId = crypto.createHash('sha256', crypto.randomBytes(256).toString('base64'))
                            .update(makeQuestion(poll.interaction.options.getString('title')) + crypto.randomBytes(256).toString())
                            .digest('SHA-256').toString('base64');

    poll.pollId = encodeURIComponent(poll.pollId).replace(/%/g, '');

    createPollEmbed(poll);

    setPollTimer(poll);

    computeFooter(poll);
    
    createButtonHandler(poll);

    poll.interaction.reply(poll.embed);

    if(poll.guildSettings.real_time_results)
    {
        await displayResults(poll);
    }
}


function createPollEmbed(poll)
{
    const embed = new MessageEmbed()
        .setColor(PrimaryColor)
        .setTitle(makeQuestion(poll.interaction.options.getString('title')));

    const buttonRows = [];
    buttonRows.push(new MessageActionRow());

    let numOptions = 0;
    for(let i = 1; i <= 10; i++)
    {
        const option = poll.interaction.options.getString(`option_${i}`);
        if(option)
        {
            if(buttonRows[buttonRows.length - 1].components.length === 5)
                buttonRows.push(new MessageActionRow());

            numOptions++
            embed.addField(`Option ${keycapEmojiMap(numOptions)}`, option, true);

            if(!poll.options)
                poll.options = new Map();

            poll.options.set(numOptions, option);

            buttonRows[buttonRows.length - 1]
                .addComponents(
                    new MessageButton()
                        .setCustomId(`${poll.pollId}${numOptions}`)
                        .setLabel(`Option ${keycapEmojiMap(numOptions)}`)
                        .setStyle('PRIMARY')
                );
        }
    }

    poll.numOptions = numOptions;

    poll.embed =  {
        embeds: [embed],
        components: buttonRows
    };
}


function setPollTimer(poll)
{
    poll.pollTime = ((poll.guildSettings.time_limit_hours * 60000) + poll.guildSettings.time_limit_minutes) * 60000;

    setTimeout(() => finalizePoll(poll), poll.pollTime);
}


function computeFooter(poll)
{
    const date = new Date(Date.now() + poll.pollTime);
    var suffix;

    switch(date.getDate())
    {
        case 1:
            suffix = 'st';
            break; 
        case 2:
            suffix = 'nd';
            break;
        case 3:
            suffix = 'rd';
            break;
        default:
            suffix = 'th';
    }

    const hours = date.getHours()%12 === 0?'12':date.getHours()%12;
    const minutes = Math.floor(date.getMinutes()/10) === 0?'0' + date.getMinutes():date.getMinutes();
    const ampm = date.getHours()/12 === 0?'am':'pm';

    const type = `${poll.guildSettings.type.charAt(0).toUpperCase() + poll.guildSettings.type.slice(1)} Poll`;
    const multiple = `${poll.guildSettings.multiple_votes?'Multiple Votes':'Single Vote'}`;
    const role = `Minimum Role: ${poll.interaction.guild.roles.cache.get(poll.guildSettings.role).name}`;

    poll.embed.embeds[0].setFooter(`Poll Ends At: ${hours}:${minutes}${ampm} on the ${date.getDate()}${suffix}\n${type}|${multiple}|${role}`);
}


function createButtonHandler(poll)
{
    poll.voters = new Map();

    const filter = i => i.customId.substring(0, poll.pollId.length) === poll.pollId;

    const collector = poll.interaction.channel.createMessageComponentCollector({ filter, time: poll.pollTime});

    collector.on('collect', async i => {
        const voteNumber = i.customId.substring(poll.pollId.length) - 1;

        const embed = new MessageEmbed()
            .setColor(PrimaryColor);

        const multiVote = poll.guildSettings.multiple_votes || poll.guildSettings.type === 'ranked';

        if(!poll.voters.has(i.user.id))
        {
            const voter = {counter: multiVote?0:voteNumber, votes: new Array(poll.numOptions).fill(null).map((value, index) => ({index: index, order: 0, state: false}))};
            voter.votes[voteNumber].state = true;
            poll.voters.set(i.user.id, voter);

            embed.setTitle(`Vote Added for Option ${keycapEmojiMap(voteNumber + 1)}`);
        }
        else
        {
            if(multiVote)
            {
                const voter = poll.voters.get(i.user.id);
                
                const state = voter.votes[voteNumber].state != true
                const counter = ++voter.counter;

                voter.votes[voteNumber].state = state;
                voter.votes[voteNumber].order = counter;
                
                embed.setTitle(`Vote ${state?'Added':'Removed'} for Option ${keycapEmojiMap(voteNumber + 1)}`);
                embed.setDescription(`${poll.guildSettings.type === 'ranked'?'Vote Ranking Descending':'Current Votes'}: 
                    ${voter.votes
                        .filter(x => x.state)
                        .sort((a, b) => a.order - b.order)
                        .map(x => keycapEmojiMap(x.index + 1))
                        .toString()}`);
            }
            else
            {
                const voter = poll.voters.get(i.user.id);
                if(voter.counter === voteNumber)
                {
                    embed.setTitle(`Vote Removed for Option ${keycapEmojiMap(voteNumber + 1)}`);
                    poll.voters.delete(i.user.id);
                } else {
                    voter.votes[voter.counter].state = voter.votes[voter.counter].state != true
                    voter.votes[voteNumber].state = voter.votes[voteNumber].state != true

                    embed.setTitle(`Vote Added for Option ${keycapEmojiMap(voteNumber + 1)}`);
                    embed.setDescription(`Vote Removed for Option ${keycapEmojiMap(voter.counter + 1)}`);

                    voter.counter = voteNumber;
                }
            }
        }

        if(poll.guildSettings.real_time_results)
        {
            await displayResults(poll);
        }
        
        i.reply({ embeds: [embed], ephemeral: true});
    });
}


function finalizePoll(poll)
{
    poll.embed.components.forEach(x => x.components.forEach(x => x.setDisabled(true)));
    poll.interaction.editReply(poll.embed);
    poll.finalize = true;
    displayResults(poll);
};


async function displayResults(poll)
{
    let sum = 0;
    poll.results = new Array(poll.numOptions).fill(0);
    if(!(poll.guildSettings.type === 'ranked') || !poll.finalize)
    {
        poll.voters.forEach((voter) => {
            voter.votes.forEach((vote) => {
                poll.results[vote.index] += vote.state;

                if(vote.state) 
                    sum++;
            });
        });
    } else {
        let excludeList = [];
        for(let i = 0; i < poll.numOptions; i++) {
            poll.voters.forEach((voter) => {
                const voteList = voter.votes.map(x => x).sort(x => x.order);
                voteList.every(value => {
                    if(excludeList.indexOf(value.index) < 0 && value.state)
                    {
                        poll.results[value.index] += 1;
                        sum++;
                        return false;
                    }
                    return true;
                });
            });
            const max = poll.results.map(x => x).sort().reverse()[0]
            if(max/sum > 0.5)
                break;

            const min = poll.results.map(x => x).sort()[0]
            poll.results.every((value, index) => {
                if(value === min)
                {
                    excludeList.push(index);
                    return false;
                }
                return true;
            });

            if(i != poll.numOptions - 1)
            {
                poll.results = new Array(poll.numOptions).fill(0);
                sum = 0;
            }
        }
    }

    await generateGraph(poll);
    
    let description;
    let descriptionOptionValue;

    let topValue;
    if(poll.guildSettings.type === 'reverse')
        topValue = poll.results.slice().sort()[0];
    else
        topValue = poll.results.slice().sort().reverse()[0];

    const tieArray = [];
    poll.results.forEach((value, index) => {
        if(value === topValue)
        {
            tieArray.push(index);
        }
    });

    if(sum == 0)
    {
        description = `No Votes, No One `;
    } else if(tieArray.length === 1) {
        description = `Option ${keycapEmojiMap(tieArray[0] + 1)} `;
        descriptionOptionValue = poll.options.get(tieArray[0] + 1);
    } else {
        description = `Tie Between ${tieArray.map(x => ` ${keycapEmojiMap(x + 1)}`).toString()} No One `
    }

    if(poll.finalize)
    {
        description = `${description} Wins!`
    } else {
        description =  `${description} Is In The Lead!`
    }

    if(descriptionOptionValue)
        description = `${description}\n\n🏆${descriptionOptionValue}`;

    const embed = new MessageEmbed()
        .setColor(PrimaryColor)
        .setTitle(makeQuestion(poll.interaction.options.getString('title')))
        .setDescription(description)
        .setImage(`attachment://${poll.pollId}.png`);

    if(!poll.followUp)
    {
        poll.followUp = await poll.interaction.followUp({ embeds: [embed], files: [{attachment: poll.graph, name: `${poll.pollId}.png`}]});
    } else {
        await poll.followUp.edit({ embeds: [embed], attachments: [], files: []});
        await poll.followUp.edit({ embeds: [embed], files: [{attachment: poll.graph, name: `${poll.pollId}.png`}]});
    }
}


async function generateGraph(poll)
{
    let pollResults =
    {
        $schema: 'https://vega.github.io/schema/vega/v3.0.json',
        width: 500,
        height: 200,
        padding: 5,
        data: [
            {
                name: 'table',
                values: poll.results.map((value, index) => ({category: `${index + 1}:${poll.options.get(index + 1)}`.slice(0, 12 - poll.numOptions), amount: value}))
            }
        ],
        scales: [
            {
                name: 'xscale',
                type: 'band',
                domain: {data: 'table', field: 'category'},
                range: 'width',
                padding: 0.05,
                round: true
            },
            {
                name: 'yscale',
                domain: {data: 'table', field: 'amount'},
                nice: true,
                range: 'height'
            }
        ],
        axes: [
            {
                orient: 'bottom', 
                scale: 'xscale', 
                labelColor: 'white',
                labelFontSize: 30,
                labelAngle: 14 + (poll.numOptions/2),
                labelLineHeight: 'line-bottom'
            }
        ],
        marks: [
            {
                name: 'bars',
                type: 'rect',
                from: {data: 'table'},
                encode:
                {
                    enter:
                    {
                        x: {scale: 'xscale', field: 'category'},
                        width: {scale: 'xscale', band: 1},
                        y: {scale: 'yscale', field: 'amount'},
                        y2: {scale: 'yscale', value: 0},
                        fill: {value: '#30972D'},
                        cornerRadiusTopLeft: {value: 20},
                        cornerRadiusTopRight: {value: 20}
                    }
                }
            },
            {
                type: 'text',
                from: {data: 'bars'},
                encode: {
                    enter: {
                        x: {field: 'x', offset: `(width + ${poll.results.length * 0.025 * 500})/${poll.results.length * 2}`},
                        y: {field: 'y'},
                        text: {field: 'datum.amount'},
                        fontSize: {value: 40},
                        fill: {value: 'white'},
                        align: {value: 'right'},
                        baseline: {value: 'bottom'}
                    }
                }
            }
        ]
    }

    const view = new vega.View(vega.parse(pollResults), {renderer: 'none'});
    
    const svg = await view.toSVG();
    
    poll.graph = await sharp(Buffer.from(svg))
        .toFormat('png')
        .toBuffer();
}

///poll title:test option_1:one option_2:two option_3:three option_4:four option_5:five option_6:six option_7:seven option_8:eight option_9:nine option_10:ten 
function keycapEmojiMap(number)
{
    switch(number)
    {
        case 1:
            return '1️⃣';
        case 2:
            return '2️⃣';
        case 3:
            return '3️⃣';
        case 4:
            return '4️⃣';
        case 5:
            return '5️⃣';
        case 6:
            return '6️⃣';
        case 7:
            return '7️⃣';
        case 8:
            return '8️⃣';
        case 9:
            return '9️⃣';
        case 10:
            return '🔟';
    }
}

function makeQuestion(title)
{
    if(title.charAt(title.length) != '?')
        return `${title}?`
    return title
}