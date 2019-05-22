
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
 *    - nodeJS lol
 *    - Viewers like you
 *        - Thank you
 * 
 *  TODO:
 *    - Scream in VC (https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md)
 *    - Re-order methods
 *    - Ranks: go by server roles, when possible, instead of hard-coded UIDs
 *    - See if I can replace "err => logError(err)" with just "logError", etc.
 *    - Use promises for the load functions
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
	pmTheDevs("Logged in.")

	// Load then watch for changes in the config file
	loadConfig(fs.readFileSync(process.env.CONFIG_PATH), true)
	fs.watchFile(process.env.CONFIG_PATH, () => {
		loadConfig(fs.readFileSync(process.env.CONFIG_PATH), false)
	})

	//global.voice = new VoiceModule(client.createVoiceBroadcast, client.channels, config.voicechannels)

	// Set the title of the "game" Screambot is "playing"
	client.user.setActivity(config.activity)
		.catch(err => logError(err))

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

		if (!inDoNotReply(message.author.id)) {

			// Pinged
			if (message.isMentioned(client.user)) {
				if (!command(message)) {
					if (message.channel.type == "dm")
						console.log(`[Direct message] Screambot has been pinged by ${message.author.username}.`)
					else
						console.log(`[${message.guild.name} - #${message.channel.name}] Screambot has been pinged by ${message.author.username}.`)

					screamIn(message.channel)
						.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
						.catch(err => logError(err))
				}
			}

			// Someone screams who is neither on the donotreply list nor Screambot itself
			else if ((message.content.toUpperCase().includes("AAA"))
			&& (message.author != client.user)) {
				if (message.channel.type == "dm")
					console.log(`[Direct message] ${message.author.username} has screamed at Screambot.`)
				else
					console.log(`[${message.guild.name} - #${message.channel.name}] ${message.author.username} has screamed.`)
				screamIn(message.channel)
					.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
					.catch(err => logError(err))
			}

			// If the message is nothing special, maybe scream anyway
			else {
				if (randomReplyChance()) {
					if (message.channel.type == "dm")
						console.log(`[Direct message] Screambot has randomly decided to reply to ${message.author.username}'s message.`)
					else
						console.log(`[${message.guild.name} - #${message.channel.name}] Screambot has randomly decided to reply to ${message.author.username}'s message.`)
					screamIn(message.channel)
						.then(message => console.log(`Replied with a ${message.content.length}-character long scream.`))
						.catch(err => logError(err))
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

	pmTheDevs("Logging out.")

	client.user.setActivity("SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
		.catch(err => logError(err))

	console.warn("Logging out...")
	client.destroy()
		.then(console.warn("Logged out."))
		.catch(err => logError(err))

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
	 * Is Servernick For ID
	 * Bro not even I know how this works
	 * It just does something and now it can't give
	 *   itself custom nicknames without it
	 */
	function _isServerNickForId(servernicks, serverId) {
		let sn
		for (let i=0; i<servernicks.length; i++) {
			sn = servernicks[i]
			if (sn.id == serverId)
				return sn
		}
		return false
	}


	if (!firstTime) {
		console.info("Config file has been changed.")
		pmTheDevs("The config file has been changed.")
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
	const chNames = Object.keys(config.channels)
	if (chNames.length == 0) {
		console.warn("No channels specified to scream in.")
	} else {
		console.info("Channels:")
		chNames.forEach( chName => {
			console.info(`    ${chName} (ID: ${config.channels[chName].id})`)
		})
		console.info()
	}


	// Server-specific nicknames
	const servernicks = Object.values(config.servernicks)
	let sn

	client.guilds.tap( server => {
		sn = _isServerNickForId(servernicks, server.id)
		if (sn != false) {
			server.me.setNickname(sn.nickname)
				.then(console.log(`Custom nickname in server ${sn.id}: ${sn.nickname}.\n`))
				.catch(err => logError(err))
		} else {
			server.me.setNickname(config.name)
				.catch(err => logError(err))
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
		pmTheDevs("The rank file has been changed.")
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
	Object.keys(ranks).forEach( rankName => {
		console.info(`${rankName}:`)
		Object.keys(ranks[rankName]).forEach ( userName => {
			console.info(`    ${userName}`)
		})
		console.info()
	})

	console.log(`Ranks successfully ${(firstTime) ? "" : "re"}loaded.`)
}


/**
 * Generate Scream
 * Generates a 1-100 character string of capital A's
 */
function generateScream() {
	let min = 1
	let max = 100

	let a = Math.floor(Math.random() * (max-min)) + min
	let scream = ""

	while (a > 0) {
		scream += "A"
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
function screamIn(ch) { return new Promise( (resolve, reject) => {
	sayIn(ch, generateScream())
		.then(message => resolve(message))
		.catch(err => reject(err))
})}


/**
 * Say In
 * Sends a message to a channel
 * Rejects if the channel is not whitelisted
 *   or if the send command screws up 
 */
function sayIn(ch, msg) { return new Promise( (resolve, reject) => {
	if (channelIdIsAllowed(ch.id) || ch.type == "dm") {
		ch.send(msg)
			.then(message => resolve(message))
			.catch(err => reject(err))
	} else {
		reject(`Screambot is not allowed to scream in the channel with the ID ${ch.id}.`)
	}
})}


/**
 * Is Admin
 * Checks if the given user ID matches an admin in the config file
 */
function isAdmin(authorId) {
	return (Object.values(ranks.admins).includes(authorId))
}


/**
 * Is Dev
 * Checks if the given user ID matches a dev in the config file
 */
function isDev(authorId) {
	return (Object.values(ranks.devs).includes(authorId))
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
 *   or if the author was not a ranked official
 * 
 * Command syntax:
 * "@Screambot [command] [args space delimited]"
 */
function command(message) { try {
	if (!message.content.includes(" ")) return false

	if (message.channel.type == "dm")
		console.log(`[Direct message] Screambot has received a command from ${message.author.username}.`)
	else
		console.log(`[${message.guild.name} - #${message.channel.name}] Screambot has received a command from ${message.author.username}.`)


	// Rank check
	let rank
	const authorId = message.author.id
	if (isDev(authorId)) rank = "dev"
	else if (isAdmin(authorId)) rank = "admin"
	else return false

	let cmd = message.content

	// Remove the mention (i.e. <@screambotsid>)
	cmd = cmd.substring(cmd.indexOf(" ") + 1)
	
	console.info(`Command: ${cmd}`)

	const firstSpaceIndex = cmd.indexOf(" ")

	// Everything after the first word
	let args = cmd.substring(firstSpaceIndex + 1)

	// Just the first word
	cmd = cmd.substring(0, firstSpaceIndex)

	if (["admin", "dev"].includes(rank)) {
		switch (cmd) {
			case "shutdown":
				process.exit(args)
				return true
		}
	}
	if ("dev" == rank) {
		switch (cmd) {
			case "say":
			case "reply":
				message.reply(args)
				return true
			//case "eval":
			//	message.reply(eval(args))
			//	return true
			//case "join":
				
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
 * PM's the dev(s) a string
 * Then console.error()'s that string
 * 
 * For nonfatal errors
 */
function logError(err) {
	console.error(err)
	pmTheDevs(`ERROR! ${err}`)
}


/**
 * Crash with
 * Logs the error object
 * PM's the devs the error object
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
 * PM
 * It PM's someone.
 */
function pm(user, string) { return new Promise( (resolve, reject) => {
	if (user === undefined) {
		reject(`User is undefined.`)
		return
	}

	user.send(string)
		.then(resolve( { user: user, string: string } ))
		.catch(err => reject(err))
})}


/**
 * PM the Devs
 * Sends a PM to everyone in the dev list
 */
function pmTheDevs(string) {
	Object.values(ranks.devs).forEach( uid => {
		pm(client.users.get(uid), string)
			.catch(console.error)
	})
}


/**
 * Returns whether a channel ID is in
 *   the list of channels in the config file
 */
function channelIdIsAllowed(channelId) {
	let channels = Object.values(config.channels)
	for (let i=0; i<channels.length; i++) {
		if (channels[i].id == channelId)
			return true
	}
	return false
}

