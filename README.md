# Poller Discord Bot
Performs polls using first past the post, ranked vote, and reverse first past the post voting.

## Setup Atlas
1. Create new cluster.
2. Click connect button. Add ip 0.0.0.0/0. Create user.
3. Create new database called POLLER.
4. Go to `config.json` and add config vars `ATLASPASS` and `ATLASUSER`.

## Setup Bot
1. Go to [DiscordApps](discord.com/developers/applications)
2. Create new application.
3. Open application, copy client ID, click bot, copy token.
4. Go to `config.json` and add config var `TOKEN`.
5. Go to `https://discord.com/oauth2/authorize?client_id={botID}&permissions=2147485696&scope=bot` with your client ID and add bot to your server.