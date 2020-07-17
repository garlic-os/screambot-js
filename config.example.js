// Fill in this file with your own information.
// N.B. All IDs must be entered as STRINGS! Not as numbers.
module.exports = {
	ADMINS: {
        // These users can use Screambot's admin commands.
        "Your friend": "<USER ID HERE>",
    },

    CHANNELS: {
        // A dictionary of the channels Screambot is allowed to scream in.
        "random server name or whatever you want - #general": "<CHANNEL ID HERE>",
    },

    // When this value is true, Screambot will halt execution if it encounters
    //   an error.
    // When false, Screambot will DM everyone with the "dev" permission the
    //   error and try to continue running.
    CRASH_ON_ERROR: false,

    DEVS: {
        // These users can use Screambot's dev commands AND admin commands.
        "You, probably": "<USER ID HERE>",
    },

    // Set this to true if you don't want Screambot to print anything to the terminal.
    DISABLE_LOGGING: false,

    // Put the login token for your Discord bot here.
    // If you'd rather, you can also replace this field with something like
    //   process.env.TOKEN to fetch it from an environment variable.
    DISCORD_BOT_TOKEN: "<DISCORD BOT TOKEN HERE>",
    
    DO_NOT_REPLY: {
        // Screambot will not scream at any user in this list.
        // If a user (or a bot!) if giving Screambot trouble, put their user ID here.
        "Naughty boy": "<USER ID HERE>",
    },

    NICKNAMES: {
        // Give Screambot server-specific nicknames here.
        "a server": ["<SERVER ID HERE>", "Screamy Boye"]
    },

    // The percent chance that Screambot will decide to treat an incoming
    //   message as a trigger to scream regardless of its content.
    RANDOM_REPLY_CHANCE: 0.5,

     // The minimum interval between accepted scream requests.
     // Any triggers to scream between this interval will be ignored.
	RATE_LIMIT_MS: 2000,
};
