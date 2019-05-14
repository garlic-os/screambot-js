
/**
 *  Screambot
 *  A Discord bot that screams
 *  Screams when:
 *    - Pinged
 *    - Someone else screams
 *    - It feels like it
 * 
 *  TODO:
 *    - Scream in VC (https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md)
 *    - Re-order methods
 *    - Come up with more chat commands
 * 	  - Make a method that PMs me errors
 *    - Add the Ooer muds' IDs to the admin list
 */

// For loading files
const fs = require("fs")

// For doing, like, all the Discord stuff
const Discord = require("discord.js")

// Makes logs look nice
require("console-stamp")(console, "[HH:MM:ss.l]")



class Screambot {
	/**
	 * Screambot Constructor
	 * Sets up:
	 *   - the client variable
	 *   - event listeners
	 * Logs in
	 */
	constructor() {
		console.log("Screambot instantiated.")
		this.client = new Discord.Client()

		// Load then watch for changes in the command list
		this.loadRanks(fs.readFileSync(process.env.RANKS_PATH), true)
		fs.watchFile(process.env.RANKS_PATH, () => {
			this.loadCmds(fs.readFileSync(process.env.RANKS_PATH), false)
		})

		this.client.on("ready", () => {
			try {

			/**
			 * On Ready
			 * Triggers when Screambot successfully
			 *   logs into Discord
			 */
			console.log(`Logged in as ${this.client.user.tag}.\n`)
			this.pmTheDevs("Logged in.")

			// Load then watch for changes in the config file
			this.loadConfig(fs.readFileSync(process.env.CONFIG_PATH), true)
			fs.watchFile(process.env.CONFIG_PATH, () => {
				this.loadConfig(fs.readFileSync(process.env.CONFIG_PATH), false)
			})

			// Load then watch for changes in the command list
			// I should probably put this in a function
			this.loadCmds(fs.readFileSync(process.env.CMDS_PATH), true)
			fs.watchFile(process.env.CMDS_PATH, () => {
				this.loadCmds(fs.readFileSync(process.env.CMDS_PATH), false)
			})

			// Set the title of the "game" Screambot is "playing"
			this.client.user.setActivity(this.config.activity)
					.catch(err => this.logError(err))

			console.log() // New line

			} catch (err) {
				this.crashWith(err)
			}
		})

		
		/**
		 * On Message
		 * Triggers when a message is posted in _any_ server
		 *   that Screambot is in
		 */
		this.client.on("message", message => {
			try {

			// Pinged
			if (message.isMentioned(this.client.user)) {
				if (message.content.includes(" ")) {
					if (this.isAdmin(message.author.id)) {
						console.log(`\nScreambot has received a command from admin ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`)
						this.command("admin", message)
					} else if (this.isDev(message.author.id)) {
						console.log(`\nScreambot has received a command from dev ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`)
						this.command("dev", message)
					}
				} else {
					console.log(`\nScreambot has been pinged by ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`)
					this.screamIn(message.channel)
							.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
							.catch(err => this.logError(err))
				}
			}

			// Someone screams who is neither on the donotreply list nor Screambot itself
			if ((message.content.toUpperCase().includes("AAA"))
			&& (message.author != this.client.user)
			&& (!this.inDoNotReply(message.author.id))) {
				console.log(`\n${message.author.username} has screamed in ${message.guild.name}/#${message.channel.name}.`)
				this.screamIn(message.channel)
						.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
						.catch(err => this.logError(err))
			}

			} catch (err) {
				this.crashWith(err)
			}
		})


		/**
		 * On Guild Create
		 * Triggers when Screambot joins a server
		 */
		this.client.on("guildCreate", guild => {
			try {
			console.log(`Joined a new server: ${guild.name} (ID: ${guild.id}). There are ${guild.memberCount} users in it.`)
			} catch (err) {
				this.crashWith(err)
			}
		})


		/**
		 * On Guild Delete
		 * Triggers when Screambot is removed from a server
		 */
		this.client.on("guildDelete", guild => {
			try {
			console.log(`Removed from server: ${guild.name} (ID: ${guild.id}).`)
			} catch (e) {
				this.crashWith(err)
			}
		})

		// (Try to) log into Discord
		console.log("Logging in...")
		this.client.login(process.env.TOKEN)
	
	
		/**
		 * On Exit
		 * Triggers when process.exit() is called
		 *   anywhere in this nodeJS program
		 * Ideally, any fatal error should call this,
		 *   but usually they don't
		 * 
		 * Cleanly logs out of Discord
		 */
		process.on('exit', code => {
			console.warn("\n")
			console.warn("------------------------------------------")
			console.warn(`About to exit with code: ${code}`)

			this.pmTheDevs("Logging out.")

			this.client.user.setActivity("SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
					.catch(err => this.logError(err))

			console.warn("Logging out...")
			this.client.destroy()
				.then(console.log("Logged out."))
				.catch(err => this.logError(err))

			console.warn("------------------------------------------\n")
		})

	}

	
	// --- Methods -------------------------

	/**
	 * Random Scream Loop
	 * Returns a timeout that:
	 *   - Waits a random amount of time (different each iteration)
	 *   - Screams in the selected channel
	 * 
	 * The nickname is just there to make the logs more readable.
	 */
	randomScreamLoop(ch, nickname) {
		const randWait = this.randWait();

		const waitF = this.msToMinAndSec(randWait/1000)
		console.log(`[${nickname}] Going to scream in ${waitF.minutes} minutes, ${waitF.seconds} seconds.`)

		let loop = setTimeout( () => {
			this.screamIn(ch)
					.then(message => {
						console.log(`Sent ${message.content.length} A's to #${message.channel.name}.\n`)
						this.randomScreamLoop(ch, nickname)
					})
					.catch(err => {
						this.logError(err)
						clearTimeout(loop)
					})
		}, randWait)

		return loop
	}


	/**
	 * Random wait
	 * Comes up with a random length of time
	 * Based off the config file
	 */
	randWait() {
		let minWait
		let maxWait
		if (Math.random() <= this.config.waittimes.short.chance) {
			minWait = this.config.waittimes.short.min
			maxWait = this.config.waittimes.short.max
		} else {
			minWait = this.config.waittimes.long.min
			maxWait = this.config.waittimes.long.max
		}

		const randWait = (Math.floor(Math.random() * maxWait)) + minWait
		if (Number.isNaN(randWait)) {
			this.logError("randWait is not a number.")
			return
		}
		return randWait
	}


	/**
	 * Start Screaming In
	 * Makes a timeout loop for
	 *   the nickname's channel
	 */
	startScreamingIn(nickname) {
		let channelId = this.config.channels[nickname].id
		if (!channelId)
			console.warn(`\nScreambot is not in any server with a channel whose name is "${nickname}" in the config file. Screambot will not scream there.`)

		let ch = this.client.channels.get(channelId)
		if (!ch)
			console.warn(`\nScreambot is not in any server that has a channel with the ID ${channelId} (labeled "${nickname}" in the config file). Screambot will not scream there.`)
		else
			ch.loop = this.randomScreamLoop(ch, nickname)
	}


	/**
	 * Start Screaming Everywhere
	 * Makes a random scream timeout
	 *   for every channel in the channels list
	 */
	startScreamingEverywhere() {
		Object.keys(this.config.channels).forEach( nickname => {
			if (this.config.channels[nickname].autoscream == "true") {
				this.startScreamingIn(nickname)
			}
		})
	}


	/**
	 * Stop Screaming In
	 * Clears the timeout assigned to the nickname's channel's loop
	 */
	stopScreamingIn(nickname) {
		let ch = this.config.channels[nickname]
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
	stopScreamingEverywhere() {
		Object.keys(this.config.channels).forEach( nickname => {
			this.stopScreamingIn(nickname)
		})
	}


	/**
	 * Restart Scream Loop
	 * Clears and remakes the timeout assigned to
	 *   the given channel nickname
	 */
	restartScreamLoop(nickname) {
		this.stopScreamingIn(nickname)
		this.startScreamingIn(nickname)
	}


	/**
	 * Restart All Scream Loops
	 * Restarts all scream loops for every channel in the channels list
	 */
	restartAllScreamLoops() {
		this.stopScreamingEverywhere();
		this.startScreamingEverywhere();
	}


	/**
	 * Load Config
	 * Converts a JSON-formatted string to a JS object
	 * Stores it as this.config
	 * Applies server-specific nicknames
	 */
	loadConfig(config, firstTime) {
		if (!firstTime) {
			console.log("Config file has been changed.")
			this.pmTheDevs("The config file has been changed.")
		}

		console.log(`${(firstTime) ? "L" : "Rel"}oading config...`)
		try { this.config = JSON.parse(config) }
		catch (err) {
			if (firstTime) {
				this.logError("The given config file is invalid! Screambot cannot continue.")
				process.exit(1)
			} else {
				this.logError("The given config file is invalid! Keeping the old config.")
				return
			}
		}

		const chNames = Object.keys(this.config.channels)

		if (chNames.length == 0) {
			console.warn("No channels specified to scream in.")
		} else {
			console.log("Channels registered:")
			chNames.forEach( chName => {
				console.log(`    ${chName} (ID: ${this.config.channels[chName].id})`)
			})
			console.log()
		}


		// Server-specific nicknames
		const servernicks = Object.values(this.config.servernicks)
		const uid = this.client.user.id
		let sn

		this.client.guilds.tap( server => {
			sn = this.isServerNickForId(servernicks, server.id)
			if (sn != false) {
				server.members.get(uid).setNickname(sn.nickname)
						.then(console.log(`\nCustom nickname in server ${sn.id}: ${sn.nickname}.\n`))
						.catch(err => this.logError(err))
			} else {
				server.members.get(uid).setNickname(this.config.name)
						.catch(err => this.logError(err))
			}

		})

		if (!firstTime) this.restartAllScreamLoops();

		console.log(`Config successfully ${(firstTime) ? "" : "re"}loaded.`)
	}


	isServerNickForId(servernicks, serverId) {
		let sn
		for (let i=0; i<servernicks.length; i++) {
			sn = servernicks[i]
			if (sn.id == serverId)
				return sn
		}
		return false
	}


	/**
	 * Load Commands
	 * Converts a JSON-formatted string to an object
	 * Sets it as this.cmds
	 */
	loadCmds(cmds, firstTime) {
		if (!firstTime) {
			console.log("The command file has been changed.")
			this.pmTheDevs("The command file has been changed.")
		}

		console.log(`${(firstTime) ? "L" : "Rel"}oading commands...`)
		try { this.cmds = JSON.parse(cmds) }
		catch (err) {
			if (firstTime) {
				this.logError("The given command file is invalid! Screambot cannot continue.")
				process.exit(1)
			} else {
				this.logError("The given command file is invalid! Keeping the old commands.")
				return
			}
		}
		console.log(`Commands successfully ${(firstTime) ? "" : "re"}loaded.`)
	}


	loadRanks(ranks, firstTime) {
		if (!firstTime) {
			console.log("The rank file has been changed.")
			this.pmTheDevs("The rank file has been changed.")
		}

		console.log(`${(firstTime) ? "L" : "Rel"}oading ranks...`)
		try { this.ranks = JSON.parse(ranks) }
		catch (err) {
			if (firstTime) {
				this.logError("The given rank file is invalid! Screambot cannot continue.")
				process.exit(1)
			} else {
				this.logError("The given rank file is invalid! Keeping the old commands.")
				return
			}
		}

		Object.keys(this.ranks).forEach( rankName => {
			console.log(`${rankName}:`)
			Object.keys(this.ranks[rankName]).forEach ( userName => {
				console.log(`    ${userName}`)
			})
			console.log()
		})

		console.log(`Ranks successfully ${(firstTime) ? "" : "re"}loaded.`)
	}


	/**
	 * Generate Scream
	 * Generates a 1-100 character string of capital A's
	 * 
	 * The fraction is the probability of a small scream
	 */
	generateScream() {
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
	screamIn(ch) { return new Promise( (resolve, reject) => {
		this.sayIn(ch, this.generateScream())
				.then(message => resolve(message))
				.catch(err => reject(err))
	})}


	/**
	 * Say In
	 * Sends a message to a channel
	 * Rejects if the channel is not whitelisted
	 *   or if the send command screws up 
	 */
	sayIn(ch, msg) { return new Promise( (resolve, reject) => {
		ch.send(msg)
				.then(message => resolve(message))
				.catch(err => reject(err))
				return
	})}


	/**
	 * Is Admin
	 * Checks if the given user ID matches an admin in the config file
	 */
	isAdmin(authorId) {
		return (Object.values(this.ranks.admins).includes(authorId))
	}

	/**
	 * Is Dev
	 * Checks if the given user ID matches a dev in the config file
	 */
	isDev(authorId) {
		return (Object.values(this.ranks.devs).includes(authorId))
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
	command(rank, message) {
		// Split into words
		let cmd = message.content.split(" ")

		// Remove first word (which is <@screambotsid)
		cmd.shift()

		// Clone cmd to args remove the keyword
		let args = [...cmd]
		args.shift()

		let cmdList
		if (rank == "admin") cmdList = this.cmds.admin
		else if (rank == "dev") cmdList = this.cmds.dev
		else {
			this.logError(`"${rank}" is not a valid rank.`)
			return
		}

		// If command matches one listed in the commands file
		Object.keys(cmdList).forEach( keywd => {
			if (cmd[0] == keywd) {
				console.log(`Command: ${cmd.toString()}`)
				eval(`${this.cmds[keywd]}(${args.toString()})`) // Oh boy I hope no one ever sees this
			}
		})
	}


	/**
	 * MS to Minutes and Seconds
	 * Converts a millisecond value to a time object
	 * 
	 * exampleTimeObj = {
	 *   minutes: 2
	 *   seconds: 30
	 * }
	 */
	msToMinAndSec(time) {
		let timeObj = {}
		timeObj.minutes = Math.floor(time / 60)
		timeObj.seconds = Math.round(time - timeObj.minutes * 60)
		return timeObj
	}


	/**
	 * In Do Not Reply
	 * Returns whether or not a User ID is in the
	 *   donotreply list
	 */
	inDoNotReply(userId) {
		return (Object.values(this.config.donotreply).includes(userId))
	}


	/**
	 * Log Error
	 * PM's the dev(s) a string
	 * Then console.error()'s that string
	 * 
	 * For nonfatal errors
	 */
	logError(err) {
		console.error(err)
		this.pmTheDevs(err)
	}

	/**
	 * PM the Devs
	 * Sends a PM to everyone in the dev list
	 */
	pmTheDevs(string) {
		Object.values(this.ranks.devs).forEach( uid => {
			this.client.users.get(uid).send(string)
		})
	}


	/**
	 * Crash with
	 * PM's the devs an error object
	 * Exits
	 * Throws the error
	 * 
	 * For fatal errors
	 */
	crashWith(err) {
		this.pmTheDevs(`${err.name} on line ${err.lineNumber}:\n${err.message}.\n${err.stack}`)
		process.exit(1)
		throw err
	}

}



/**
 * Instantiate Screambot
 * If this line doesn't execute,
 *   Screambot never starts
 * 
 * If you wanted, I guess you could
 *   delete it and then run it from the
 *   command line instead or something
 */
const screambot = new Screambot()
