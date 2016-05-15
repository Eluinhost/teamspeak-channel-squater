const creator = new (require('teamspeak-channel-squatter'))();

creator
    .withCredentials('serveradmin', 'password', 'TEST')
    .withAllowedGroups([])
    .withConnectionInfo('uhc.gg', 10011, 9989)
    .inChannel(1173)
    .withActions(
        (bot, clid) => {
            bot.sendPoke(clid, 'test success poke');
            bot.sendMessage(clid, 'success');
            bot.kickClient(clid, 'success');
        },
        (bot, clid) => {
            bot.sendPoke(clid, 'test no perms poke');
            bot.sendMessage(clid, 'no perms');
            bot.kickClient(clid, 'no perms');
        }
    )
    .build() // Build the bot
    .start() // Start the bot
    .then(() => console.log('Connected!'))
    .catch(err => console.error(err));

