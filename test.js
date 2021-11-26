let poll = {}
poll.options = [0, 1, 2];
poll.results = new Array(poll.options.length).fill(0);

poll.voters = [
    {
        counter: 2, 
        votes: [
            {
                index: 0, 
                order: 0, 
                state: true
            },
            {
                index: 1, 
                order: 1, 
                state: false
            },
            {
                index: 2, 
                order: 2, 
                state: true
            }
        ]
    },
    {
        counter: 2, 
        votes: [
            {
                index: 0, 
                order: 0, 
                state: false
            },
            {
                index: 1, 
                order: 1, 
                state: true
            },
            {
                index: 2, 
                order: 2, 
                state: false
            }
        ]
    },
    {
        counter: 2, 
        votes: [
            {
                index: 0, 
                order: 0, 
                state: false
            },
            {
                index: 1, 
                order: 1, 
                state: false
            },
            {
                index: 2, 
                order: 2, 
                state: true
            }
        ]
    }
]

let sum = 0;

let excludeList = [];
for(let i = 0; i < poll.options.length; i++) {
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

    poll.results = new Array(poll.options.length).fill(0);
    sum = 0;
}

console.log(poll.results);