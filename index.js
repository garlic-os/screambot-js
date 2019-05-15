
/**
 *  Screambot
 *  A Discord bot that screams
 *  Screams when:
 *    - Pinged
 *    - Someone else screams
 *    - It feels like it
 * 
 *  If you're using this and you're not me, make sure to set
 *    These environment variables:
 *    - TOKEN: The bot token
 *    - CONFIG_PATH: Path to a JSON file holding Screambot's configuration
 *    - CMDS_PATH: Path to a JSON file defining Screambot's chat commands
 *    - RANKS_PATH: Path to a JSON file saying who's what rank
 * 
 *  TODO:
 *    - Scream in VC (https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md)
 *    - Re-order methods
 *    - Come up with more chat commands
 *    - Ranks: go by server roles, when possible, instead of hard-coded UIDs
 *    - See if you can replace "err => logError(err)" with just "logError", etc.
 *    - Use promises for the load functions
 *    - Add scream variations
 *        - Ending h's
 *        - Ending rgh
 *        - Ending punctuation
 *        - Beginning lowercase a's
 *        - Beginning o's
 */


// Requirements
const fs = require("fs")
const Discord = require("discord.js")
require("console-stamp")(console, "[HH:MM:ss.l]") // Makes the logs look nice



// --- Setup ------------------------------
console.log("Screambot started.")
const client = new Discord.Client()

// Shameful global variables
global.config = {}
global.cmds = {}
global.ranks = {}

// Load then watch for changes in the command list
loadRanks(fs.readFileSync(process.env.RANKS_PATH), true)
fs.watchFile(process.env.RANKS_PATH, () => {
	loadCmds(fs.readFileSync(process.env.RANKS_PATH), false)
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

	// Load then watch for changes in the command list
	// I should probably put this in a function
	loadCmds(fs.readFileSync(process.env.CMDS_PATH), true)
	fs.watchFile(process.env.CMDS_PATH, () => {
		loadCmds(fs.readFileSync(process.env.CMDS_PATH), false)
	})

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

	// Pinged
	if (message.isMentioned(client.user)) {
		if (message.content.includes(" ")) {
			if (isAdmin(message.author.id)) {
				console.log(`\nScreambot has received a command from admin ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`)
				command("admin", message)
			} else if (isDev(message.author.id)) {
				console.log(`\nScreambot has received a command from dev ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`)
				command("dev", message)
			}
		} else {
			console.log(`\nScreambot has been pinged by ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`)
			screamIn(message.channel)
				.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
				.catch(err => logError(err))
		}
	}

	// Someone screams who is neither on the donotreply list nor Screambot itself
	if ((message.content.toUpperCase().includes("AAA"))
	&& (message.author != client.user)
	&& (!inDoNotReply(message.author.id))) {
		console.log(`\n${message.author.username} has screamed in ${message.guild.name}/#${message.channel.name}.`)
		screamIn(message.channel)
			.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
			.catch(err => logError(err))
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
	console.log(`Joined a new server: ${guild.name} (ID: ${guild.id}). There are ${guild.memberCount} users in it.`)
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
	console.log(`Removed from server: ${guild.name} (ID: ${guild.id}).`)
	} catch (e) {
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
	console.warn("\n")
	console.warn("------------------------------------------")
	console.warn(`About to exit with code: ${code}`)

	pmTheDevs("Logging out.")

	client.user.setActivity("SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
		.catch(err => logError(err))

	console.warn("Logging out...")
	client.destroy()
		.then(console.warn("Logged out."))
		.catch(err => logError(err))

	console.warn("------------------------------------------\n")
})



// --- Methods -------------------------

/**
 * Random Scream Loop
 * Returns a timeout that:
 *   - Waits a random amount of time (different each iteration)
 *   - Screams in the selected channel
 * 
 * The nickname is just there to make the logs more readable.
 */
function randomScreamLoop(ch, nickname) {
	/**
	 * MS to Minutes and Seconds
	 * Converts a millisecond value to a time object
	 * 
	 * exampleTimeObj = {
	 *   minutes: 2
	 *   seconds: 30
	 * }
	 */
	function _msToMinAndSec(time) {
		let timeObj = {}
		timeObj.minutes = Math.floor(time / 60)
		timeObj.seconds = Math.round(time - timeObj.minutes * 60)
		return timeObj
	}

	const wait = randWait()

	const waitF = _msToMinAndSec(wait/1000)
	console.log(`[${nickname}] Going to scream in ${waitF.minutes} minutes, ${waitF.seconds} seconds.`)

	let loop = setTimeout( () => {
		screamIn(ch)
			.then(message => {
				console.log(`Sent ${message.content.length} A's to #${message.channel.name}.\n`)
				randomScreamLoop(ch, nickname)
			})
			.catch(err => {
				logError(err)
				clearTimeout(loop)
			})
	}, wait)

	return loop
}


/**
 * Random wait
 * Comes up with a random length of time
 * Based off the config file
 */
function randWait() {
	let minWait
	let maxWait
	if (Math.random() <= config.waittimes.short.chance) {
		minWait = config.waittimes.short.min
		maxWait = config.waittimes.short.max
	} else {
		minWait = config.waittimes.long.min
		maxWait = config.waittimes.long.max
	}

	const value = (Math.floor(Math.random() * maxWait)) + minWait
	if (Number.isNaN(value)) {
		logError("randWait returned NaN.")
		return
	}
	return value
}


/**
 * Start Screaming In
 * Makes a timeout loop for
 *   the nickname's channel
 */
function startScreamingIn(nickname) {
	let channelId = config.channels[nickname].id
	if (!channelId)
		console.warn(`\nScreambot is not in any server with a channel whose name is "${nickname}" in the config file. Screambot will not scream there.`)

	let ch = client.channels.get(channelId)
	if (!ch)
		console.warn(`\nScreambot is not in any server that has a channel with the ID ${channelId} (labeled "${nickname}" in the config file). Screambot will not scream there.`)
	else
		ch.loop = randomScreamLoop(ch, nickname)
}


/**
 * Start Screaming Everywhere
 * Makes a random scream timeout
 *   for every channel in the channels list
 */
function startScreamingEverywhere() {
	Object.keys(config.channels).forEach( nickname => {
		if (config.channels[nickname].autoscream) {
			startScreamingIn(nickname)
		}
	})
}


/**
 * Stop Screaming In
 * Clears the timeout assigned to the nickname's channel's loop
 */
function stopScreamingIn(nickname) {
	let ch = config.channels[nickname]
	//try {
		clearTimeout(ch.loop)
	//} catch (e) {
	//	if (!e instanceof TypeError) throw e
	//}
}


/**
 * Stop Screaming Everywhere
 * Clears the timeout for every channel in the channels list
 */
function stopScreamingEverywhere() {
	Object.keys(config.channels).forEach( nickname => {
		stopScreamingIn(nickname)
	})
}


/**
 * Restart Scream Loop
 * Clears and remakes the timeout assigned to
 *   the given channel nickname
 */
function restartScreamLoop(nickname) {
	stopScreamingIn(nickname)
	startScreamingIn(nickname)
}


/**
 * Restart All Scream Loops
 * Restarts all scream loops for every channel in the channels list
 */
function restartAllScreamLoops() {
	stopScreamingEverywhere();
	startScreamingEverywhere();
}


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
	 * It just does something and now loadConfig
	 *   won't work without it
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
		console.info("Channels registered:")
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
				.then(console.log(`\nCustom nickname in server ${sn.id}: ${sn.nickname}.\n`))
				.catch(err => logError(err))
		} else {
			server.me.setNickname(config.name)
				.catch(err => logError(err))
		}

	})

	if (!firstTime) restartAllScreamLoops();

	console.log(`Config successfully ${(firstTime) ? "" : "re"}loaded.`)
}


/**
 * Load Commands
 * Converts a JSON-formatted string to an object
 * Sets it as cmds
 */
function loadCmds(buffer, firstTime) {
	if (!firstTime) {
		console.info("The command file has been changed.")
		pmTheDevs("The command file has been changed.")
	}

	console.log(`${(firstTime) ? "L" : "Rel"}oading commands...`)
	try { cmds = JSON.parse(buffer) }
	catch (err) {
		if (firstTime) {
			crashWith("The given command file is invalid! Screambot cannot continue.")
		} else {
			logError("The given command file is invalid! Keeping the old commands.")
			return
		}
	}
	console.log(`Commands successfully ${(firstTime) ? "" : "re"}loaded.`)
}


/**
 * Load ranks
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
 * 
 * The fraction is the probability of a small scream
 */
function generateScream() {
	let min = 1
	let max = 100

	/*
	// Big scream or smol scream?
	if (Math.random() <= (3/4)) {
		min = 5
		max = 100
	} else {
		min = 101
		max = 2000
	}
	*/

	let a = Math.floor(Math.random() * (max-min)) + min
	let scream = ""

	while (a > 0) {
		scream += "A"
		a--
	}

	return scream
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
	if (channelIdIsAllowed(ch.id)) {
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
 * Command syntax:
 * "@Screambot [command] [args space delimited]"
 */
function command(rank, message) {
	// Split into words
	let cmd = message.content.split(" ")

	// Remove first word (which is <@screambotsid)
	cmd.shift()

	// Clone cmd to args remove the keyword
	let args = [...cmd]
	args.shift()

	let cmdList
	if (rank == "admin") cmdList = cmds.admin
	else if (rank == "dev") cmdList = cmds.dev
	else {
		logError(`"${rank}" is not a valid rank.`)
		return
	}

	// If command matches one listed in the commands file
	Object.keys(cmdList).forEach( keywd => {
		if (cmd[0] == keywd) {
			console.log(`Command: ${cmd.toString()}`)
			eval(`${cmds[keywd]}(${args.toString()})`) // Oh boy I hope no one ever sees this
		}
	})
}


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
	pmTheDevs(err)
		.then(rsp => `Sent message to ${rsp.user.username}: "${rsp.string}"`)
		.catch(console.error)
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
	console.error(err)
	pmTheDevs(err)
	process.exit(1)
	throw err
}


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


function channelIdIsAllowed(channelId) {
	Object.values(config.channels).forEach( nickname => {
		if (config.channels[nickname].id == channelId)
			return true
	})
	return false
}
