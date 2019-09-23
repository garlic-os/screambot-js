
/**
 *  Screambot
 *  A Discord bot that screams
 *  Screams when:
 *    - Pinged
 *    - Someone else screams
 *    - Someone says something (sometimes)
 * 
 *  Environment variables:
 *    - DISCORD_BOT_TOKEN: The token you get when you make a Discord bot. discord.js uses this to log in.
 *    - S3_BUCKET_NAME: The name of the S3 bucket Screambot will look for files in.
 *    - AWS_ACCESS_KEY_ID: The credentials for a user that can access the specified S3 bucket.
 *    - AWS_SECRET_ACCESS_KEY: Same as above?? idk how this works tbh.
 *    - CONFIG_FILENAME: The name of the file on the designated S3 bucket.
 *    - RANKS_FILENAME: CONFIG_FILENAME, but for the ranks file.
 *    - LOCAL_MODE: When 1, CONFIG_FILENAME and RANKS_FILENAME point files on the same machine as Screambot instead of an S3 bucket. Useful for when you just want to run it on your own computer, instead of on a server like Heroku. S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY won't be used and don't need to be specified.
 *                  When 0, CONFIG_FILENAME and RANKS_FILENAME point files on the given S3 bucket. Necessary for when running from a cloud server like Heroku. S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY must be filled out.
 * 
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
 *    - Put the functions in a sensible order
 *    - Ranks: go by server role IDs, when possible, instead of user IDs
 *    - Make things more asynchronous
 *    - Add scream variations (maybe?)
 *        - Ending h's
 *        - Ending rgh
 *        - Ending punctuation
 *        - Beginning lowercase a's
 *        - Beginning o's
 *        - o's instead of a's
 *    - Make a "help" command
 *        - Will be necessary if I want this to be something others can use
 *    - Merge ranks.json with config.json
 *        - Will require a good bit of code reworking
 *    - Make the code for responding to pings not garbage
 *    - Schedule different messages for certain dates
 *    - Change scream on the fly, per server
 *    - Fix the "update" command
 */

console.log("Screambot started.")

// Because "0" and "false" don't evaluate to false by themselves in JavaScript
const localMode = process.env.LOCAL_MODE != "0" && process.env.LOCAL_MODE != "false"

// Helpful for debugging
process.on("unhandledRejection", up => { throw up })

// Requirements
const Discord = require("discord.js")
const AWS = require("aws-sdk") // for accessing remote files in an S3 bucket
const fs = require("fs") // for accessing local files

// Makes the logs look nice
require("console-stamp")(console, {
	datePrefix: "",
	dateSuffix: "",
	pattern: " "
})

// Set up AWS to fetch files from an S3 bucket
AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const s3 = new AWS.S3()

const client = new Discord.Client()

// Shameful global variables
global.config = {}
global.ranks = {}

loadRanks()

/**
 * On Ready
 * Triggers when Screambot successfully
 *   logs into Discord
 */
client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}.\n`)
	if (localMode) dmTheDevs("Logged in.") // Gets SUPER annoying when Heroku refreshes your program every day, so only while on local mode

	loadConfig()

	// Set the title of the "game" Screambot is "playing"
	client.user.setActivity(config.activity)
		.then(console.log(`Successfully set Screambot's activity: ${config.activity}`))
		.catch(logError)
})


/**
 * On Message
 * Triggers when a message is posted in _any_ server
 *   that Screambot is in
 * 
 * Here be dragons
 */
client.on("message", message => {
	if (
		(!inDoNotReply(message.author.id)) && ( // Not in the donotreply list
			(channelIdIsAllowed(message.channel.id)) || // Is in either a channel Screambot is allowed in,
			(message.channel.type == "dm") // or a DM channel
		)
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

		// Someone screams
		else if (isScream(message.content)) {
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
	console.warn(msg)
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
	console.warn(msg)
})


// (Try to) log into Discord
console.log("Logging in...")
client.login(process.env.DISCORD_BOT_TOKEN)


// --- Functions -------------------------

/**
 * Log Out
 * Logs out of Discord
 */
function logOut() {
	console.warn("---------------------------------")
	console.info(`Logging out.`)
	if (localMode) dmTheDevs("Logging out.")

	client.destroy()
		.then(console.warn("Logged out."))

	console.warn("---------------------------------\n")
}


/**
* Update nicknames
* Sets Screambot's server-specific nicknames
* Requires config to exist first
*/
function updateNicknames() {
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

	let erred = false
	
	const nicknames = Object.values(config.nicknames)
	client.guilds.tap(server => { // Don't ask me what tap means or does
		let nickname = _getNickname(nicknames, server.id)
		if (nickname) {
			server.me.setNickname(nickname.name)
				.then(console.log(`Custom nickname in ${client.guilds.get(nickname.id)}: ${nickname.name}.\n`))
				.catch( (err) => {
					erred = true
					logError(err)
				})
		}
	})
}


/**
 * Access
 * Reads a file either from S3_BUCKET_NAME
 *   or locally, depending on LOCAL_MODE
 *   
 * Resolves to a Buffer, intended
 *   to be JSON parsed
 * 
 * If LOCAL_MODE is on, it will also
 *   watch the file for changes and
 *   call the callback.
 */
function access(fileName, cb) { return new Promise( (resolve, reject) => {
	if (localMode) { // read local file
		fs.watchFile(fileName, cb)
		const fileBuffer = fs.readFileSync(`./${fileName}`)
		if (fileBuffer === undefined || fileBuffer === null)
			reject(fileBuffer)
		else
			resolve(fileBuffer)
	}
	
	else { // read remote file from S3 bucket
		const params = {
			Bucket: process.env.S3_BUCKET_NAME, 
			Key: fileName
		}

		s3.getObject(params, (err, data) => {
			if (data.Body === undefined || data.Body === null) {
				reject(data.Body)
			} else {
				if (err)
					reject(err)
				else
					resolve(data.Body)
			}	
		})
	}
})}


/**
 * Print Registered Channels
 * Prints to console all the channels
 *   that are listed in the given
 *   config object
 * 
 *  Yeah, yeah, I know about console.table.
 *  For some reason I couldn't get my data
 *    formatted how I want with it.
 */
function printRegisteredChannels(channels) {
	if (Object.keys(channels).length == 0) {
		console.warn("No channels specified to scream in.")
	} else {
		console.info("Channels:")
		let chName
		for (chName in channels) {
			console.info(`    ${chName} (ID: ${channels[chName].id})`)
		}
		console.info()
	}
}


/**
 * Print Ranking members
 * Prints to console all the users
 *   who are listed in the given
 *   ranks object
 */
function printRankingMembers(ranks) {
	for (rankName in ranks) {
		console.info(`${rankName}:`)
		for (userName in ranks[rankName]) {
			console.info(`    ${userName}`)
		}
		console.info()
	}
}


/**
 * Load Config
 * Accesses the config JSON file from CONFIG_PATH
 * Converts it to an Object
 * Stores it as config
 * Applies server-specific nicknames
 */
function loadConfig() { new Promise ( (resolve, reject) => {
	const firstTime = isEmpty(config)
	console.log(`${(firstTime) ? "Loading" : "Updating"} config...`)

	access(process.env.CONFIG_FILENAME, loadConfig)
		.then( body => {
			try { config = JSON.parse(body) } // Set the config variable
			catch (err) {
				if (firstTime) {
					crashWith(Error("The given config file is invalid! Screambot cannot continue.", err))
					return
				} else {
					logError(Error("The given config file is invalid! Keeping the old config.", err))
					return
				}
			}

			printRegisteredChannels(config.channels)

			updateNicknames()

			console.log(`Config successfully ${(firstTime) ? "loaded" : "updated"}.`)
			if (!firstTime) dmTheDevs("Config successfully updated.")

			resolve()
		})
			
		
		.catch ( err => {
			(firstTime)
				? crashWith(Error("Could not access the config file! Screambot cannot continue.", err))
				: logError(Error("Could not access the config file! Keeping the old configuration.", err))

			reject()
		})
})}


/**
 * Load Ranks
 * Accesses the ranks JSON file specifed in RANKS_PATH
 * Converts it to an Object
 * Sets it as Ranks
 */
function loadRanks() { new Promise ( (resolve, reject) => {
	const firstTime = isEmpty(ranks)
	console.log(`${(firstTime) ? "Loading" : "Updating"} ranks...`)

	access(process.env.RANKS_FILENAME, loadRanks)
		.then( body => {
			try { ranks = JSON.parse(body) } // Set the ranks variable
			catch (err) {
				if (firstTime) {
					crashWith(Error("The given ranks file is invalid! Screambot cannot continue."), err)
					return
				} else {
					logError(Error("The given ranks file is invalid! Keeping the old ranks."), err)
					return
				}
			}

			printRankingMembers(config.ranks)

			console.log(`Ranks successfully ${(firstTime) ? "loaded" : "updated"}.`)
			if (!firstTime) dmTheDevs("Ranks successfully updated.")

			resolve()
		})


		.catch ( err => {
			(firstTime)
				? crashWith("Could not access the ranks file! Screambot cannot continue.", err)
				: logError("Could not access the ranks file! Keeping the old ranks.", err)

			reject()
		})
})}


/**
 * Generate Scream
 * Generates a 1-100 character string of capital A's
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

	let cmd = message.content.toLowerCase()
	cmd = cmd.substring(cmd.indexOf(" ") + 1) // Remove the mention (i.e. <@screambotsid>)
	console.info(`Command: ${cmd}`)
	cmd = cmd.split(" ")

	const keyword = cmd.shift()

	// -- COMMAND LIST --

	/*switch (cmd) { // anybody commands (none right now)
		case "asdf":

			return true
	}*/
	if (rank >= 1) { // Admin (and up) commands
		switch (keyword) {
			case "shutdown":
				sayIn(message.channel, "AAAAAAAAAAA SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
					.then(message => console.log(`${locationString(message)} Sent the shutdown message, "${message.content}".`))
					.catch(logError)
				process.exit(cmd.join(" "))
				return true
		}
	}
	if (rank >= 2) { // Dev (and up) commands
		switch (keyword) {

			case "say":
				sayIn(message.channel, cmd.join(" "))
					.then(message => console.log(`${locationString(message)} Sent the message, "${message.content}".`))
					.catch(logError)
				return true

			case "sayin":
				const sayin_channelId = cmd.shift()
				if (client.channels.has(sayin_channelId))
					sayIn(client.channels.get(sayin_channelId), cmd.join(" "))
						.then(message => console.log(`${locationString(message)} Sent the message, "${message.content}".`))
						.catch(logError)
				else
					sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SPEAK THERE AAAAAAAAAAAAAA")
						.then(message => console.log(`${locationString(message)} Sent the error message, "${message.content}".`))
						.catch(logError)
				return true

			case "reply":
				message.reply(cmd.join(" "))
					.then(message => console.log(`${locationString(message)} Replied with the message, "${message.content}".`))
					.catch(logError)
				return true

			case "screamin":
				if (client.channels.has(cmd[0]))
					screamIn(client.channels.get(cmd[0]))
						.then(message => console.log(`${locationString(message)} Sent a ${message.content.length}-character long scream.`))
						.catch(logError)
				else
					sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SCREAM THERE AAAAAAAAAAAAAA")
						.then(message => console.log(`${locationString(message)} Sent the error message, "${message.content}".`))
						.catch(logError)
				return true

			/*case "update":
				const updateWhat = cmd.shift()
				console.log(updateWhat)
				switch(updateWhat) {
					case "config":
						sayIn(message.channel, "AAAAAAAAAAAAAA UPDATING CONFIG AAAAAAAAAAAAAA")
							.then(message => console.log(`${locationString(message)} Promised, "${message.content}".`))
							.catch(logError)
						loadConfig(false)
							.then( () => {
								sayIn(message.channel, "AAAAAAAAAAAAAA CONFIG UPDATED AAAAAAAAAAAAAA")
										.then(message => console.log(`${locationString(message)} Resolved, "${message.content}".`))
										.catch(logError)
							})
							.catch( () => {
								sayIn(message.channel, "AAAAAAAAAAAAAA COULDN'T UPDATE THE CONFIG CHECK THE LOGS AAAAAAAAAAAAAA")
									.then(message => console.log(`${locationString(message)} Rejected, "${message.content}".`))
									.catch(logError)
							})
						return true
					case "ranks":
						sayIn(message.channel, "AAAAAAAAAAAAAA UPDATING RANKS AAAAAAAAAAAAAA")
							.then(message => console.log(`${locationString(message)} Promised, "${message.content}".`))
							.catch(logError)
						loadRanks(false)
							.then( () => {
								sayIn(message.channel, "AAAAAAAAAAAAAA RANKS UPDATED AAAAAAAAAAAAAA")
										.then(message => console.log(`${locationString(message)} Resolved, "${message.content}".`))
										.catch(logError)
							})
							.catch( () => {
								sayIn(message.channel, "AAAAAAAAAAAAAA COULDN'T UPDATE THE RANKS CHECK THE LOGS AAAAAAAAAAAAAA")
									.then(message => console.log(`${locationString(message)} Rejected, "${message.content}".`))
									.catch(logError)
							})
						return true
					case "nicknames":
						sayIn(message.channel, "AAAAAAAAAAAAAA UPDATING NICKNAMES AAAAAAAAAAAAAA")
							.then(message => console.log(`${locationString(message)} Promised, "${message.content}".`))
							.catch(logError)
						updateNicknames()
							// Promise-ifying this function oddly makes it crash, so, uhhh, nevermind sending a feedback message for this command
							/*.then( () => {
								sayIn(message.channel, "AAAAAAAAAAAAAA NICKNAMES UPDATED AAAAAAAAAAAAAA.")
										.then(message => console.log(`${locationString(message)} Resolved, "${message.content}".`))
										.catch(logError)
							})
							.catch( () => {
								sayIn(message.channel, "AAAAAAAAAAAAAA NICKNAMED UPDATED WITH ERRORS CHECK THE LOGS AAAAAAAAAAAAAA")
									.then(message => console.log(`${locationString(message)} Rejected, "${message.content}".`))
									.catch(logError)
							})
						return true
					default:
						sayIn(message.channel, `AAAAAAAAAAAAAA I CAN ONLY UPDATE CONFIG, RANKS, AND NICKNAMES AAAAAAAAAAAAAA`)
							.then(message => console.log(`${locationString(message)} Sent the error message, "${message.content}".`))
							.catch(logError)
						return true
				}
				return true*/

			//case "eval": // I want this to eval JS but I couldn't figure out how to get it to work right. Maybe it's for the better.
			//	message.reply(eval(args))
			//	return true

			//case "join": // For VC if I ever figure that out
		}
	}
	return false
} catch (err) { logError(Error(`A command caused an error: ${message}`, err)) } }


/**
 * In Do Not Reply
 * Returns whether or not a User ID is in the
 *   donotreply list
 */
function inDoNotReply(userId) {
	return (Object.values(config.donotreply).includes(userId)) || (userId == client.user.id)
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
 * Crash with
 * Logs the error(s)
 * DM's the devs the error(s)
 * Exits
 * Throws the error(s)
 * 
 * For fatal errors
 */
function crashWith(errObj) {
	logError(errObj)
	process.exit(1)
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
	if (ranks.devs) {
		for (let userId of Object.values(ranks.devs)) {
			dm(client.users.get(userId), string)
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
	return (message.channel.type == "dm")
		? `[Direct message]`
		: `[${message.guild.name} - #${message.channel.name}]`
}


/**
 * Is Empty
 * Determines if an object is empty
 */
function isEmpty(obj) {
    return Object.entries(obj).length === 0 && obj.constructor === Object
};
