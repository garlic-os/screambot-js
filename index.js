
/**
 *  Screambot
 *  A Discord bot that screams
 *  Screams when:
 *    - Pinged
 *    - Someone else screams
 *    - Someone says something (sometimes)
 * 
 *  If you're using this and you're not me, make sure to set
 *    these environment variables:
 *    - TOKEN: The bot token
 *    - CONFIG_PATH: Path to a JSON file holding Screambot's configuration
 *    - RANKS_PATH:  Path to a JSON file saying who's a Screambot ranking official
 * 
 *  I couldn't have done this without:
 *    - Mozilla Developer Network Web Docs: https://developer.mozilla.org/en-US/
 *    - discord.js and its documentation: https://discord.js.org/#/
 *    - Inspiration and encouragement from friends and family
 *    - node.js lol
 *    - Viewers like you
 *        - Thank you
 * 
 *  TODO:
 *    - Scream in VC (https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md)
 *    - Put the functions in a more sensible order
 *    - Ranks: go by server roles, when possible, instead of hard-coded userIds
 *    - Make things more asynchronous
 *    - Add scream variations (maybe?)
 *        - Ending h's
 *        - Ending rgh
 *        - Ending punctuation
 *        - Beginning lowercase a's
 *        - Beginning o's
 *        - o's instead of a's
 *    - Make a "help" command
 *    - Merge ranks.json with config.json
 *    - Make the code for responding to pings not garbage
 *    - Refactor names for:
 *        - variables
 *        - functions
 *        - methods
 *    - Change the scream on the fly, per server
 */


// Requirements
const fs = require("fs")
const Discord = require("discord.js")

// Makes the logs look nice
require("console-stamp")(console, {
	datePrefix: "",
	dateSuffix: "",
	pattern: " "
})



// --- Setup ------------------------------
console.log("Screambot started.")
const client = new Discord.Client()

// Shameful global variables
global.config = {}
global.ranks  = {}

// Load then watch for changes in the command list
loadRanks(fs.readFileSync(process.env.RANKS_PATH), true)
fs.watchFile(process.env.RANKS_PATH, () => {
	loadRanks(fs.readFileSync(process.env.RANKS_PATH), false)
})

client.on("ready", () => {
	try {

	/**
	 * On Ready
	 * Triggers when Screambot successfully
	 *   logs into Discord
	 */
	console.log(`Logged in as ${client.user.tag}.\n`)
	dmTheDevs("Logged in.")

	// Load, then watch for changes in, the config file
	loadConfig(fs.readFileSync(process.env.CONFIG_PATH), true)
	fs.watchFile(process.env.CONFIG_PATH, () => {
		loadConfig(fs.readFileSync(process.env.CONFIG_PATH), false)
	})

	// Set the title of the "game" Screambot is "playing"
	client.user.setActivity(config.activity)
		.catch(logError)

	console.log() // New line

	} catch (err) {
		crashWith(err)
	}
})


/**
 * On Message
 * Triggers when a message is posted in _any_ server
 *   that Screambot is in
 */
client.on("message", message => {
	try {

		if (
			(!inDoNotReply(message.author.id)) &&
			((channelIdIsAllowed(message.channel.id)) || // ugh
				(message.channel.type == "dm"))
		) {

			// Pinged
			if (message.isMentioned(client.user)) {
				if (!command(message)) {
					console.log(`${locationString(message)} Screambot has been pinged by ${message.author.username}.`)

					screamIn(message.channel)
						.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
						.catch(logError)
				}
			}

			// Someone screams who is neither on the donotreply list nor Screambot itself
			else if ((isScream(message.content))
			&& (message.author != client.user)) {
				console.log(`${locationString(message)} ${message.author.username} has screamed.`)
				screamIn(message.channel)
					.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
					.catch(logError)
			}

			// Always scream at DM's
			else if (message.channel.type == "dm") {
				console.log(`[Direct message] ${message.author.username} sent Screambot a DM.`)
				screamIn(message.channel)
					.then(message => console.log(`Replied with a ${message.content.length}-character long scream.`))
					.catch(logError)
			}
			
			// If the message is nothing special, maybe scream anyway
			else {
				if (randomReplyChance()) {
					console.log(`${locationString(message)} Screambot has randomly decided to reply to ${message.author.username}'s message.`)
					screamIn(message.channel)
						.then(message => console.log(`Replied with a ${message.content.length}-character long scream.`))
						.catch(logError)
				}
			}
		}


	} catch (err) {
		crashWith(err)
	}
})


/**
 * On Guild Create
 * Triggers when Screambot joins a server
 */
client.on("guildCreate", guild => {
	try {

	console.log(`---------------------------------
Screambot has been added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
---------------------------------`)

	} catch (err) {
		crashWith(err)
	}
})


/**
 * On Guild Delete
 * Triggers when Screambot is removed from a server
 */
client.on("guildDelete", guild => {
	try {
	console.log(`---------------------------------
Screambot has been removed from a server.
${guild.name} (ID: ${guild.id})
---------------------------------`)
	} catch (err) {
		crashWith(err)
	}
})


// (Try to) log into Discord
console.log("Logging in...")
client.login(process.env.TOKEN)


/**
 * On Exit
 * Triggers when process.exit() is called
 *   anywhere in this nodeJS program
 * Ideally, any fatal error should call this,
 *   but usually they don't
 * 
 * Cleanly logs out of Discord
 */
process.on("exit", code => {
	console.warn("---------------------------------")
	console.warn(`About to exit with code: ${code}`)

	dmTheDevs("Logging out.")

	client.user.setActivity("SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
		.catch(logError)

	console.warn("Logging out...")
	client.destroy()
		.then(console.warn("Logged out."))
		.catch(logError)

	console.warn("---------------------------------\n")
})



// --- Methods -------------------------

/**
 * Load Config
 * Converts a JSON-formatted string to a JS object
 * Stores it as config
 * Applies server-specific nicknames
 */
function loadConfig(buffer, firstTime) {
	/**
	 * (Private function)
	 * Get Nickname
	 * Returns the nickname corresponding
	 *   to the given server
	 */
	function _getNickname(nicknames, serverId) {
		for (let nickname of nicknames) {
			if (nickname.id == serverId)
				return nickname
		}
		return false
	}


	if (!firstTime) {
		console.info("Config file has been changed.")
		dmTheDevs("The config file has been changed.")
	}

	console.log(`${(firstTime) ? "L" : "Rel"}oading config...`)
	try { config = JSON.parse(buffer) }
	catch (err) {
		if (firstTime) {
			crashWith("The given config file is invalid! Screambot cannot continue.")
			return
		} else {
			logError("The given config file is invalid! Keeping the old config.")
			return
		}
	}

	// Print registered channels
	if (Object.keys(config.channels).length == 0) {
		console.warn("No channels specified to scream in.")
	} else {
		console.info("Channels:")
		let chName
		for (chName in config.channels) {
			console.info(`    ${chName} (ID: ${config.channels[chName].id})`)
		}
		console.info()
	}

	// Nicknames
	const nicknames = Object.values(config.nicknames)
	client.guilds.tap(server => { // Don't ask me what tap means
		let nickname = _getNickname(nicknames, server.id)
		if (nickname) {
			server.me.setNickname(nickname.name)
				.then(console.log(`Custom nickname in ${client.guilds.get(nickname.id)}: ${nickname.name}.\n`))
				.catch(logError)
		}

	})

	console.log(`Config successfully ${(firstTime) ? "" : "re"}loaded.`)
}


/**
 * Load Ranks
 * Converts a JSON-formatted string to an Object
 * Sets it as Ranks
 */
function loadRanks(buffer, firstTime) {
	if (!firstTime) {
		console.info("The rank file has been changed.")
		dmTheDevs("The rank file has been changed.")
	}

	console.log(`${(firstTime) ? "L" : "Rel"}oading ranks...`)
	try { ranks = JSON.parse(buffer) }
	catch (err) {
		if (firstTime) {
			crashWith("The given rank file is invalid! Screambot cannot continue.")
		} else {
			logError("The given rank file is invalid! Keeping the old commands.")
			return
		}
	}

	// Print ranking members
	for (rankName in ranks) {
		console.info(`${rankName}:`)
		for (userName in ranks[rankName]) {
			console.info(`    ${userName}`)
		}
		console.info()
	}

	console.log(`Ranks successfully ${(firstTime) ? "" : "re"}loaded.`)
}


/**
 * Generate Scream
 * Generates a 1-100 character string of capital A's
 */
function generateScream() {
	const min = 1
	const max = 30 // 100

	let a = Math.floor(Math.random() * (max-min)) + min
	let scream = ""
	
	const user = client.users.get("569575994504118292")

	while (a > 0) {
		scream += `HAPPY BIRTHDAY @Dayton Audio SUB-1200 Subwoofer#8631 ` // A
		a--
	}

	return scream
}


function randomReplyChance() {
	return (Math.random() * 100 <= config.randomreplychance)
}


/**
 * Scream In
 * Generates a scream with generateScream()
 *   and sends it to the given channel with sayIn()
 */
function screamIn(channel) { return new Promise( (resolve, reject) => {
	sayIn(channel, generateScream())
		.then(resolve)
		.catch(reject)
})}


/**
 * Say In
 * Sends a message to a channel
 * Rejects if the channel is not whitelisted
 *   or if the send command screws up 
 */
function sayIn(channel, string) { return new Promise( (resolve, reject) => {
	if (channelIdIsAllowed(channel.id) || channel.type == "dm") {
		channel.send(string)
			.then(resolve)
			.catch(reject)
	} else {
		reject(`Screambot is not allowed to scream in [${channel.guild.name} - #${channel.name}].`)
	}
})}


/**
 * Is Admin
 * Checks if the given user ID matches an admin in the config file
 */
function isAdmin(userId) {
	return (Object.values(ranks.admins).includes(userId))
}


/**
 * Is Dev
 * Checks if the given user ID matches a dev in the config file
 */
function isDev(userId) {
	return (Object.values(ranks.devs).includes(userId))
}


/**
 * Command
 * Parses and executes commands received from a Screambot ranked official
 * Ranks are in the config file
 * 
 * Admins can only execute admin commands
 * Devs can execute both admin and dev commands
 * 
 * Returns true if a command was executed
 * Returns false if no command was executed
 * 
 * Command syntax:
 * "@Screambot [command] [args space delimited]"
 */
function command(message) { try {
	if (!message.content.includes(" ")) return false
	
	console.log(`${locationString(message)} Screambot has received a command from ${message.author.username}.`)

	// Rank check
	const authorId = message.author.id
	let rank = 0
	if      (isAdmin(authorId)) rank = 1 // Admin = 1
	else if (isDev  (authorId)) rank = 2 // Dev   = 2

	let cmd = message.content
	cmd = cmd.substring(cmd.indexOf(" ") + 1) // Remove the mention (i.e. <@screambotsid>)
	console.info(`Command: ${cmd}`)
	cmd = cmd.split(" ")

	// -- COMMAND LIST --

	//switch (cmd) { // anybody commands (none right now)
	//	case "asdf":

	//}
	if (rank >= 1) { // Admin (and up) commands
		switch (cmd[0]) {
			case "shutdown":
				sayIn(message.channel, "AAAAAAAAAAA SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
					.then(message => console.log(`${locationString(message)} Sent the shutdown message, "${message.content}".`))
					.catch(logError)
				process.exit(args)
				return true
		}
	}
	if (rank >= 2) { // Dev (and up) commands
		switch (cmd.shift()) {

			case "say":
				sayIn(message.channel, cmd.join(" "))
					.then(message => console.log(`${locationString(message)} Sent the message, "${message.content}".`))
					.catch(logError)
				return true

			case "sayin":
				sayIn(client.channels.get(cmd.shift()), cmd.join(" "))
					.then(message => console.log(`${locationString(message)} Sent the message, "${message.content}".`))
					.catch(logError)
				return true

			case "reply":
				message.reply(cmd.join(" "))
					.then(message => console.log(`${locationString(message)} Replied with the message, "${message.content}".`))
					.catch(logError)
				return true

			case "screamin":
				const channel = client.channels.get(cmd.join(" "))
				if (channelIdIsAllowed(channel.id))
					screamIn(client.channels.get(cmd.join(" ")))
						.then(message => console.log(`${locationString(message)} Sent a ${message.content.length}-character long scream.`))
						.catch(logError)
				else
					sayIn(message.channel, `AAAAAA I'M NOT ALLOWED THERE AAAAAAAAAAAAAAAAAAAAAAAA`)
				return true

			//case "eval": // I want this to eval JS but I couldn't figure out how to get it to work right. maybe its for the better
			//	message.reply(eval(args))
			//	return true

			//case "join": // For VC if I ever figure that out
				
		}
	}
	return false
} catch (err) { logError(err) } }


/**
 * In Do Not Reply
 * Returns whether or not a User ID is in the
 *   donotreply list
 */
function inDoNotReply(userId) {
	return (Object.values(config.donotreply).includes(userId))
}


/**
 * Log Error
 * DM's the dev(s) a string
 * Then console.error()'s that string
 * 
 * For nonfatal errors
 */
function logError(err) {
	console.error(err)
	dmTheDevs(`ERROR! ${err}`)
}


/**
 * Crash with
 * Logs the error object
 * DM's the devs the error object
 * Exits
 * Throws the error
 * 
 * For fatal errors
 */
function crashWith(err) {
	logError(err)
	process.exit(1)
	throw err
}


/**
 * DM
 * It DM's someone.
 */
function dm(user, string) { return new Promise( (resolve, reject) => {
	if (user === undefined) {
		reject(`User is undefined.`)
		return
	}

	user.send(string)
		.then(resolve( { user: user, string: string } ))
		.catch(reject)
})}


/**
 * DM the Devs
 * Sends a DM to everyone in the dev list
 */
function dmTheDevs(string) {
	for (let userId of Object.values(ranks.devs)) {
		dm(client.users.get(userId), string)
			.catch(console.error)
	}
}


/**
 * Channel ID is Allowed
 * Returns whether a channel ID is in
 *   the list of channels in the config file
 */
function channelIdIsAllowed(channelId) {
	for (let channel of Object.values(config.channels)) {
		if (channel.id === channelId)
			return true
	}
	return false
}


/**
 * Is Scream
 * Returns whether the provided string
 *   is considered a scream or not
 * Putting it here in its own place
 *   makes it easier to make the scream
 *   condition more complex
 */
function isScream(string) {
	return (string.toUpperCase().includes("AAA"))
}


/**
 * Location string
 * A syntactic shortcut for when a
 *   callback or promise from a message 
 *   wants to log where Screambot sent
 *   a message
 */
function locationString(message) {
	if (message.channel.type == "dm")
		return `[Direct message]`
	else
		return `[${message.guild.name} - #${message.channel.name}]`

}
