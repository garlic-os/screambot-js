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

if (config.NODE_ENV === "production")
	process.on("unhandledRejection", logError)
else
	process.on("unhandledRejection", up => { throw up })

require("console-stamp")(console, {
	datePrefix: "",
	dateSuffix: "",
	pattern: " "
})

const Discord = require("discord.js")
const client = new Discord.Client()

/**
 * On Ready
 * Triggers when Screambot successfully
 *   logs into Discord
 */
client.on("ready", () => {
	updateNicknames()
	client.user.setActivity("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")

	console.log(`Logged in as ${client.user.tag}.\n`)

	channelTable().then(table => {
		console.info("Channels:")
		console.table(table)
	})
	.catch(console.warn)

	nicknameTable().then(table => {
		console.info("Nicknames:")
		console.table(table)
	})
	.catch(console.info)
})


/**
 * On Message
 * Triggers when a message is posted in _any_ server
 *   that Screambot is in
 */
client.on("message", message => {
	if ((!inDoNotReply(message.author.id)) && ( // Not in the donotreply list
			(channelIdIsAllowed(message.channel.id)) || // Is in either a channel Screambot is allowed in,
			(message.channel.type == "dm"))) { // or a DM channel
	
		// Pinged
		if (message.isMentioned(client.user)) {
			if (!command(message)) {
				console.log(`${locationString(message)} Screambot has been pinged by ${message.author.username}.`)

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

		// Always scream at DM's
		else if (message.channel.type == "dm") {
			console.log(`[Direct message] ${message.author.username} sent Screambot a DM.`)
			screamIn(message.channel)
				.then(message => console.log(`Replied with a ${message.content.length}-character long scream.`))
		}
		
		// If the message is nothing special, maybe scream anyway
		else {
			if (randomReplyChance()) {
				console.log(`${locationString(message)} Screambot has randomly decided to reply to ${message.author.username}'s message.`)
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
	const msg = `---------------------------------
Screambot has been added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
---------------------------------`
	dmTheDevs(msg)
	console.info(msg)
})


/**
 * On Guild Delete
 * Triggers when Screambot is removed from a server
 */
client.on("guildDelete", guild => {
	const msg = `---------------------------------
Screambot has been removed from a server.
${guild.name} (ID: ${guild.id})
---------------------------------`
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
 * @return {Promise<void>} Whether there were errors or not
 */
function updateNicknames() {
	return new Promise ( (resolve, reject) => {
		var erred = false

		for (const serverName in config.NICKNAMES) {
			const pair = config.NICKNAMES[serverName]
			const server = client.guilds.get(pair[0])
			if (!server) {
				console.warn(`${config.NAME} isn't in ${pair[0]}! Nickname cannot be set here.`)
				continue
			}
			server.me.setNickname(pair[1])
				.catch(err => {
					erred = true
					logError(err)
				})
		}

		if (erred) return reject()
		resolve()

	})
}


/**
 * Generate Scream
 * Generates a 1-100 character string of capital A's
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
 * Random Reply Chance
 * 
 * Returns a boolean based on RANDOM_REPLY_CHANCE
 * 
 * @return {boolean} Whether to reply or not
 */
function randomReplyChance() {
	return (Math.random() * 100 <= config.RANDOM_REPLY_CHANCE)
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
	return Object.values(config.ADMINS).includes(userId)
}


/**
 * Is Dev
 * Checks if the given user ID matches a dev in the config file
 */
function isDev(userId) {
	return Object.values(config.DEVS).includes(userId)
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
	return Object.values(config.DO_NOT_REPLY).includes(userId) || userId == client.user.id
}


/**
 * Log Error
 * DM's the dev(s) a string
 * Then console.error()'s that string
 * 
 * For nonfatal errors
 */
function logError(errObj) {
	console.error(errObj); // Semicolon randomly required to prevent a TypeError
	(errObj.message)
		? dmTheDevs(`ERROR! ${errObj.message}`)
		: dmTheDevs(`ERROR! ${errObj}`)
}


/**
 * DM
 * It DM's someone.
 */
function dm(user, string) { return new Promise( (resolve, reject) => {
	if (user === undefined) reject(`User is undefined.`)

	user.send(string)
		.then(resolve( { user: user, string: string } ))
		.catch(reject)
})}


/**
 * DM the Devs
 * Sends a DM to everyone in the dev list
 */
function dmTheDevs(string) {
	if (config.DEVS) {
		for (const i in config.DEVS) {
			dm(client.fetchUser(config.DEVS[i]), string)
				.catch(console.error)
		}
	} else {
		console.error(`---------------------------------
           Screambot tried to DM the devs
           before the dev list has been
           initialized. This is not good.
           ---------------------------------`)
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
	return (message.channel.type == "dm")
		? `[Direct message]`
		: `[${message.guild.name} - #${message.channel.name}]`
}


/**
 * Generates an object containing stats about
 *   what channels are whitelisted.
 * 
 * @example
 *     channelTable().then(console.table)
 */
function channelTable() {
	return new Promise( (resolve, reject) => {
		if (isEmpty(config.CHANNELS))
			return reject("No channels are whitelisted.")

		const stats = {}
		for (const i in config.CHANNELS) {
			const channelId = config.CHANNELS[i]
			const channel = client.channels.get(channelId)
			const stat = {}
			stat["Server"] = channel.guild.name
			stat["Name"] = "#" + channel.name
			stats[channelId] = stat
		}
		resolve(stats)
	})
}


/**
 * Generates an object containing stats about
 *   what nicknames Bipolar has and what
 *   servers in which she has them.
 * 
 * @example
 *     nicknameTable().then(console.table)
 */
function nicknameTable() {
	return new Promise( (resolve, reject) => {
		if (isEmpty(config.NICKNAMES))
			return reject("No nicknames defined.")

		const stats = {}
		for (const serverName in config.NICKNAMES) {
			const [ serverId, nickname ] = config.NICKNAMES[serverName]
			const server = client.guilds.get(serverId)
			const stat = {}
			stat["Server"] = server.name
			stat["Intended"] = nickname
			stat["De facto"] = server.me.nickname
			stats[serverId] = stat
		}
		resolve(stats)
	})
}

function isEmpty(obj) {
	for (const key in obj) {
		if (obj.hasOwnProperty(key))
    		return false
		}
	return true
}
