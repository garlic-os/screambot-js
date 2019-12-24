"use strict"

// Load environment variables to const config
// JSON parse any value that is JSON parseable
const config = {}
for (const key in process.env) {
	try {
		config[key] = JSON.parse(process.env[key])
	} catch (e) {
		config[key] = process.env[key]
	}
}

// Log errors when in production; crash when not in production
if (config.NODE_ENV === "production")
	process.on("unhandledRejection", logError)
else
	process.on("unhandledRejection", up => { throw up })

// Overwrite console methods with empty ones if logging is disabled
if (config.DISABLE_LOGS) {
	const methods = ["log", "debug", "warn", "info", "table"]
    for (const method of methods) {
        console[method] = () => {}
    }
} else {
	require("console-stamp")(console, {
		datePrefix: "",
		dateSuffix: "",
		pattern: " "
	})
}

const Discord = require("discord.js")
const client = new Discord.Client()

/**
 * On Ready
 * Triggers when Screambot successfully
 *   logs into Discord
 */
client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag}.\n`)
	updateNicknames()
	client.user.setActivity("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
		.then( ({ game }) => console.info(`Activity set: ${status(game.type)} ${game.name}`))

	channelTable(config.CHANNELS).then(table => {
		console.info("Channels:")
		console.table(table)
	})
	.catch(console.warn)

	nicknameTable(config.NICKNAMES).then(table => {
		console.info("Nicknames:")
		console.table(table)
	})
	.catch(console.warn)
})


/**
 * On Message
 * Triggers when a message is posted in _any_ server
 *   that Screambot is in
 */
client.on("message", message => {
	if ((!inDoNotReply(message.author.id)) && ( // Not in the donotreply list
			(channelIdIsAllowed(message.channel.id)) || // Is in either a channel Screambot is allowed in,
			(message.channel.type === "dm"))) { // or a DM channel
	
		// Pinged
		if (message.isMentioned(client.user)) {
			if (!command(message)) {
				console.log(`${locationString(message)} Pinged by ${message.author.username}.`)

				screamIn(message.channel)
					.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
			}
		}

		// Someone screams
		else if (isScream(message.content)) {
			console.log(`${locationString(message)} ${message.author.username} has screamed.`)
			screamIn(message.channel)
				.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
		}

		// Always scream at DMs
		else if (message.channel.type === "dm") {
			console.log(`[Direct message] Received a DM from ${message.author.username}.`)
			screamIn(message.channel)
				.then(message => console.log(`Replied with a ${message.content.length}-character long scream.`))
		}
		
		// If the message is nothing special, maybe scream anyway
		else {
			if (randomReplyChance()) {
				console.log(`${locationString(message)} Randomly decided to reply to ${message.author.username}'s message.`)
				screamIn(message.channel)
					.then(message => console.log(`Replied with a ${message.content.length}-character long scream.`))
			}
		}
	}
})


/**
 * On Guild Create
 * Triggers when Screambot joins a server
 */
client.on("guildCreate", guild => {
	const msg = `-------------------------------
Added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
-------------------------------`
	dmTheDevs(msg)
	console.info(msg)
})


/**
 * On Guild Delete
 * Triggers when Screambot is removed from a server
 */
client.on("guildDelete", guild => {
	const msg = `-------------------------------
Removed from a server.
${guild.name} (ID: ${guild.id})
-------------------------------`
	dmTheDevs(msg)
	console.info(msg)
})


// Log into Discord
console.log("Logging in...")
client.login(config.DISCORD_BOT_TOKEN)


// --- Functions -------------------------


/**
 * Sets the custom nicknames from the config file
 * 
 * @async
 * @return {Promise<void>} Resolve: nothing (there were no errors); Reject: array of errors
 */
async function updateNicknames(nicknameDict) {
	const errors = []

	for (const serverName in nicknameDict) {
		const [ serverId, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverId)
		if (!server) {
			console.warn(`Nickname configured for a server that Bipolar is not in. Nickname could not be set in ${serverName} (${serverId}).`)
			continue
		}
		server.me.setNickname(nickname)
			.catch(errors.push)
	}

	if (errors.length > 0)
		throw errors
	else
		return
}


/**
 * Generates a 1-100 character string of capital A's.
 * 
 * @return {string} scream
 */
function generateScream() {
	const min = 1
	const max = 100

	let a = Math.floor(Math.random() * (max-min)) + min
	let scream = ""

	while (a > 0) {
		scream += "A"
		a--
	}

	return scream
}


/**
 * Returns a boolean based on RANDOM_REPLY_CHANCE.
 * 
 * @return {boolean} Whether to reply or not
 */
function randomReplyChance() {
	return Math.random() * 100 <= config.RANDOM_REPLY_CHANCE
}


/**
 * Scream In
 * Generates a scream with generateScream()
 *   and sends it to the given channel with sayIn()
 * 
 * @async
 * @param {Channel} channel - channel to scream in
 * @return {Promise<Message|Error>} Resolve: message sent; Reject: error message
 */
async function screamIn(channel) {
	return await sayIn(channel, generateScream())
}


/**
 * Send a message to a channel.
 * Rejects if the channel is not whitelisted.
 * 
 * @async
 * @param {Channel} channel - channel to send the message to
 * @param {string} string - message to send
 * @return {Promise<Message|string>} Resolve: Message object that was sent; Reject: error message
 */
async function sayIn(channel, string) {
	if (channelIdIsAllowed(channel.id) || channel.type === "dm")
		return await channel.send(string)

	throw `Not allowed to scream in [${channel.guild.name} - #${channel.name}].`
}


/**
 * Is [val] in [obj]?
 * 
 * @param {any} val
 * @param {Object} object
 * @return {Boolean} True/false
 */
function has(val, obj) {
	for (const i in obj) {
		if (obj[i] === val)
			return true
	}
	return false
}


function isAdmin(userId) {
	return has(userId, config.ADMINS)
}


function isDev(userId) {
	return has(userId, config.DEVS)
}


/**
 * Command
 * Parses and executes commands received from a Screambot ranked official
 * 
 * Admins can only execute admin commands
 * Devs can execute both admin and dev commands
 * 
 * Returns true if a command was executed
 * Returns false if no command was executed
 * 
 * Here be dragons
 * 
 * Command syntax:
 * "@Screambot [command] [args space delimited]"
 */
function command(message) { try {
	if (!message.content.includes(" ")) return false
	
	console.log(`${locationString(message)} Received a command from ${message.author.username}.`)

	// Rank check
	const authorId = message.author.id
	let rank = 0
	if      (isAdmin(authorId)) rank = 1 // Admin = 1
	else if (isDev  (authorId)) rank = 2 // Dev   = 2

	let cmd = message.content.toLowerCase()
	cmd = cmd.substring(cmd.indexOf(" ") + 1) // Remove the mention (i.e. <@screambotsid>)
	console.info(`Command: ${cmd}`)
	cmd = cmd.split(" ")

	const keyword = cmd.shift()

	// -- COMMAND LIST --

	if (rank >= 1) { // Admin (and up) commands
		switch (keyword) {
			case "shutdown":
				sayIn(message.channel, "AAAAAAAAAAA SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
					.then(message => console.log(`${locationString(message)} Sent the shutdown message, "${message.content}".`))
				process.exit(cmd.join(" "))
				break
			default:
				return false
		}
	}
	if (rank >= 2) { // Dev (and up) commands
		switch (keyword) {

			case "say":
				sayIn(message.channel, cmd.join(" "))
					.then(message => console.log(`${locationString(message)} Sent the message, "${message.content}".`))
				break

			case "sayin":
				const sayin_channelId = cmd.shift()
				if (client.channels.has(sayin_channelId))
					sayIn(client.channels.get(sayin_channelId), cmd.join(" "))
						.then(message => console.log(`${locationString(message)} Sent the message, "${message.content}".`))
				else
					sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SPEAK THERE AAAAAAAAAAAAAA")
						.then(message => console.log(`${locationString(message)} Sent the error message, "${message.content}".`))
				break

			case "screamin":
				if (client.channels.has(cmd[0]))
					screamIn(client.channels.get(cmd[0]))
						.then(message => console.log(`${locationString(message)} Sent a ${message.content.length}-character long scream.`))
				else
					sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SCREAM THERE AAAAAAAAAAAAAA")
						.then(message => console.log(`${locationString(message)} Sent the error message, "${message.content}".`))
				break

			default:
				return false
		}
	}
	return true
} catch (err) { logError(Error(`A command caused an error: ${message}`, err)) } }


/**
 * In Do Not Reply
 * Returns whether or not a User ID is in the
 *   donotreply list
 */
function inDoNotReply(userId) {
	return Object.values(config.DO_NOT_REPLY).includes(userId) || userId === client.user.id
}


/**
 * DM the dev(s) and console.error a message.
 * For nonfatal errors.
 * 
 * @param {Error|string} errObj - error object or string
 */
function logError(errObj) {
	console.error(errObj); // Semicolon randomly required to prevent a TypeError
	(errObj.message)
		? dmTheDevs(`ERROR! ${errObj.message}`)
		: dmTheDevs(`ERROR! ${errObj}`)
}


/**
 * It DM's someone.
 * 
 * @async
 * @param {User} user - User to DM
 * @param {string} string - message to send
 * @return {Promise<Object|Error>} Resolve: object containing the input arguments; Reject: error message
 */
async function dm(user, string) {
	if (!user) throw `User does not exist.`
	await user.send(string)
	return { user: user, string: string }
}


/**
 * Send a DM to everyone in the dev list.
 * 
 * @async
 * @param {string} string - message to send
 * @return {Promise<undefined|Error>} Resolve: nothing; Reject: error
 */
async function dmTheDevs(string) {
	if (config.DEVS) {
		for (const i in config.DEVS) {
			const user = await client.fetchUser(config.DEVS[i])
			dm(user, string)
				.catch(console.error)
		}
	} else {
		console.error(`-------------------------------
           Tried to DM the devs before the
		   dev list has been initialized. 
		   This is not good.
           -------------------------------`)
	}
}


/**
 * Channel ID is Allowed
 * Returns whether a channel ID is in
 *   the list of channels in config
 */
function channelIdIsAllowed(channelId) {
	for (const i in config.CHANNELS) {
		if (config.CHANNELS[i] === channelId)
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
	return string.toUpperCase().includes("AAA")
}


/**
 * Location string
 * A syntactic shortcut for when a
 *   callback or promise from a message 
 *   wants to log where Screambot sent
 *   a message
 */
function locationString(message) {
	return (message.channel.type === "dm")
		? `[Direct message]`
		: `[${message.guild.name} - #${message.channel.name}]`
}


/**
 * Generates an object containing stats about
 *   all the channels in the given dictionary.
 * 
 * @async
 * @param {Object} channelDict - Dictionary of channels
 * @return {Promise<Object|Error>} Resolve: Object intended to be console.table'd; Reject: "empty object
 * 
 * @example
 *     channelTable(config.SPEAKING_CHANNELS)
 *         .then(console.table)
 */
async function channelTable(channelDict) {
	if (config.DISABLE_LOGS)
		return {}
	
	if (isEmpty(channelDict))
		throw "No channels are whitelisted."

	const stats = {}
	for (const i in channelDict) {
		const channelId = channelDict[i]
		const channel = client.channels.get(channelId)
		const stat = {}
		stat["Server"] = channel.guild.name
		stat["Name"] = "#" + channel.name
		stats[channelId] = stat
	}
	return stats
}


/**
 * Generates an object containing stats about
 *   all the nicknames Bipolar has.
 * 
 * @async
 * @param {Object} nicknameDict - Dictionary of nicknames
 * @return {Promise<Object|Error>} Resolve: Object intended to be console.table'd; Reject: "empty object"
 * 
 * @example
 *     nicknameTable(config.NICKNAMES)
 *         .then(console.table)
 */
async function nicknameTable(nicknameDict) {
	if (config.DISABLE_LOGS)
		return {}
	
	if (isEmpty(nicknameDict))
		throw "No nicknames defined."

	const stats = {}
	for (const serverName in nicknameDict) {
		const [ serverId, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverId)
		const stat = {}
		stat["Server"] = server.name
		stat["Intended"] = nickname
		stat["De facto"] = server.me.nickname
		stats[serverId] = stat
	}
	return stats
}


function isEmpty(obj) {
	for (const key in obj) {
		if (obj.hasOwnProperty(key))
    		return false
		}
	return true
}


/**
 * Get status name from status code
 * 
 * @param {number} code - status code
 * @return {string} status name
 */
function status(code) {
	return ["Playing", "Streaming", "Listening", "Watching"][code]
}
