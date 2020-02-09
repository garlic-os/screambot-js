"use strict"

// Load environment variables to const config
// JSON parse any value that is JSON parseable
const config = require("./defaults")
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

const log = {
	  say:    message => console.log(`${locationString(message)} Sent the message, "${message.content}".`)
	, scream: message => console.log(`${locationString(message)} Sent a ${message.content.length}-character long scream.`)
	, screamReply: message => console.log(`Replied with a ${message.content.length} A's.\n`)
	, error:  message => console.log(`${locationString(message)} Sent the error message, "${message.content}".`)
}

const Discord = require("discord.js")
    , embeds = require("./embeds")
    , client = new Discord.Client()

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
	if (!inDoNotReply(message.author.id) && ( // Not in the Do-Not-Reply list
			canScreamIn(message.channel.id) || // Is in either a channel Screambot is allowed in,
			message.channel.type === "dm")) { // or a DM channel
	
		// Pinged
		if (message.isMentioned(client.user)) {
			if (!command(message)) {
				console.log(`${locationString(message)} Pinged by ${message.author.username}.`)

				screamIn(message.channel)
					.then(log.screamReply)
			}
		}

		// Someone screams
		else if (isScream(message.content)) {
			console.log(`${locationString(message)} ${message.author.username} has screamed.`)
			screamIn(message.channel)
				.then(log.screamReply)
		}

		// Always scream at DMs
		else if (message.channel.type === "dm") {
			console.log(`[Direct message] Received a DM from ${message.author.username}.`)
			screamIn(message.channel)
				.then(log.screamReply)
		}
		
		// If the message is nothing special, maybe scream anyway
		else {
			if (randomReplyChance()) {
				console.log(`${locationString(message)} Randomly decided to reply to ${message.author.username}'s message.`)
				screamIn(message.channel)
					.then(log.screamReply)
			}
		}
	}
})


/**
 * On Guild Create
 * Triggers when Screambot joins a server
 */
client.on("guildCreate", guild => {
	const embed = new Discord.RichEmbed()
		.setAuthor("Added to a server.")
		.setTitle(guild.name)
		.setDescription(guild.id)
		.setThumbnail(guild.iconURL)
		.addField(`Owner: ${guild.owner.user.tag}`, `${guild.ownerID}\n\n${guild.memberCount} members`)
		.addBlankField()

	let logmsg = `-------------------------------
Added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
Channels:`

	/**
	 * Add an inline field to the embed and a
	 *   line to the log message
	 *   for every text channel in the guild.
	 */
	guild.channels.tap(channel => {
		if (channel.type === "text") {
			embed.addField(`#${channel.name}`, channel.id, true)
			logmsg += `\n#${channel.name} (ID: ${channel.id})`
		}
	})

	logmsg += "\n-------------------------------"
	dmTheDevs(embed)
	console.info(logmsg)
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
 * @return {Promise<void|Error[]>} Resolve: nothing (there were no errors); Reject: array of errors
 */
async function updateNicknames(nicknameDict) {
	const errors = []

	for (const serverName in nicknameDict) {
		const [ serverID, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverID)
		if (!server) {
			console.warn(`Nickname configured for a server that Screambot is not in. Nickname could not be set in ${serverName} (${serverID}).`)
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
 * @param {Channel} channel - channel to scream in
 * @return {Promise<Message>} Message object that was sent
 */
function screamIn(channel) {
	return sayIn(channel, generateScream())
}


/**
 * Send a message to a channel.
 * Rejects if the channel is not whitelisted.
 * 
 * @param {Channel} channel - channel to send the message to
 * @param {string} string - message to send
 * @return {Promise<Message>} Message object that was sent
 */
function sayIn(channel, string) {
	if (canScreamIn(channel.id) || channel.type === "dm")
		return channel.send(string)

	throw `Not allowed to scream in [${channel.guild.name} - #${channel.name}].`
}


/**
 * Is [val] in [obj]?
 * 
 * @param {any} val
 * @param {Object} object
 * @return {boolean} True/false
 */
function has(val, obj) {
	for (const i in obj) {
		if (obj[i] === val)
			return true
	}
	return false
}


function canScreamIn(channelID) {
	return has(channelID, config.CHANNELS)
}


function isAdmin(userID) {
	return has(userID, config.ADMINS)
}


function isDev(userID) {
	return has(userID, config.DEVS)
}


function inDoNotReply(userID) {
	return has(userID, config.DO_NOT_REPLY) || userID === client.user.id
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
	const authorID = message.author.id
	if (!(message.content.includes(" ") // Message has to have a space (more than one word)
	&& (isAdmin(authorID) || isDev(authorID)))) // and come from an admin or dev
		return false
	
	console.log(`${locationString(message)} Received a command from ${message.author.username}.`)

	const args = message.content.split(" ")
	args.shift() // Remove "@Screambot"
	const command = args.shift().toLowerCase()

	// -- COMMAND LIST --
	switch (command) {
		case "say":
			sayIn(message.channel, args.join(" "))
				.then(log.say)
			break

		case "sayin":
			const channelID = args.shift() // Subtract first entry so it doesn't get in the way later
			if (client.channels.has(channelID))
				sayIn(client.channels.get(channelID), args.join(" "))
					.then(log.say)
			else
				sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SPEAK THERE AAAAAAAAAAAAAA")
					.then(log.error)
			break

		case "screamin":
			if (client.channels.has(args[0]))
				screamIn(client.channels.get(args[0]))
					.then(log.scream)
			else
				sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SCREAM THERE AAAAAAAAAAAAAA")
					.then(log.error)
			break

		case "servers":
			const servers_embed = new Discord.RichEmbed()
				.setTitle("Member of these servers:")

			client.guilds.tap(server => {
				servers_embed.addField(server.name, server.id, true)
			})

			sayIn(message.channel, servers_embed)
				.then(console.log(`${locationString(message)} Listed servers.`))
			break

		case "channels":
			if (!args[0]) {
				sayIn(message.channel, embeds.error("AAAAAAAAAAAAAAAAA\nMISSING SERVER ID\nSyntax: @screambot channels [server ID]"))
					.then(log.error)
				break
			}

			const channels_guild = client.guilds.get(args[0])
			if (!channels_guild) {
				sayIn(message.channel, embeds.error("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA INVALID SERVER ID"))
					.then(log.error)
			}
			const channels_embed = new Discord.RichEmbed()
				.setTitle(`Channels in ${channels_guild.name} (ID: ${channels_guild.id}):`)

			channels_guild.channels.tap(channel => {
				if (channel.type === "text")
					channels_embed.addField(`#${channel.name}`, channel.id, true)
			})

			sayIn(message.channel, channels_embed)
				.then(console.log(`${locationString(message)} Listed channels for ${channels_guild.name} (ID: ${channels_guild.id}).`))
			break

		case "screaming":
			if (!args[0]) {
				sayIn(message.channel, embeds.error("AAAAAAAAAAAAAAAAA\nMISSING SERVER ID\nSyntax: @screambot channels [server ID]"))
					.then(log.error)
				break
			}

			const screaming_guild = client.guilds.get(args[0])
			if (!screaming_guild) {
				sayIn(message.channel, embeds.error("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA INVALID SERVER ID"))
					.then(log.error)
			}
			const screaming_embed = new Discord.RichEmbed()
				.setTitle(`Able to scream in these channels in ${screaming_guild.name} (ID: ${screaming_guild.id}):`)

			screaming_guild.channels.tap(channel => {
				if (canScreamIn(channel.id))
					screaming_embed.addField(`#${channel.name}`, channel.id, true)
			})

			sayIn(message.channel, screaming_embed)
				.then(console.log(`${locationString(message)} Listed channels that Screambot can scream in for ${screaming_guild.name} (ID: ${screaming_guild.id}).`))
			break

		default:
			return false
	}
	return true
} catch (err) { logError(`A command caused an error: ${message}\n${err}`) } }



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
 * DM someone.
 * 
 * @param {User} user - User to DM
 * @param {string} string - message to send
 * @return {Promise<{user, string}>} object containing the input arguments
 */
async function dm(user, string) {
	if (!user) throw `User does not exist.`
	await user.send(string)
	return { user: user, string: string }
}


/**
 * Send a DM to everyone in the dev list.
 * 
 * @param {string} string - message to send
 * @return {Promise<void>}
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
		const channelID = channelDict[i]
		const channel = client.channels.get(channelID)
		const stat = {}
		stat["Server"] = channel.guild.name
		stat["Name"] = "#" + channel.name
		stats[channelID] = stat
	}
	return stats
}


/**
 * Generates an object containing stats about
 *   all the nicknames Bipolar has.
 * 
 * @param {Object} nicknameDict - Dictionary of nicknames
 * @return {Promise<Object>} Object intended to be console.table'd
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
		const [ serverID, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverID)
		const stat = {}
		stat["Server"] = server.name
		stat["Intended"] = nickname
		stat["De facto"] = server.me.nickname
		stats[serverID] = stat
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
