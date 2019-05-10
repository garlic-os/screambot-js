
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
 */

const fs = require("fs");
const Discord = require("discord.js");
require("console-stamp")(console, "[HH:MM:ss.l]");



class Screambot {
	/**
	 * Screambot Constructor
	 * Sets up:
	 *   - the client variable
	 *   - event listeners
	 * Logs in
	 */
	constructor() {
		console.log("Screambot instantiated.");
		this.client = new Discord.Client();


		this.client.on("ready", () => {
			/**
			 * On Ready
			 * Triggers when Screambot successfully
			 *   logs into Discord
			 */
			console.log(`Logged in as ${this.client.user.tag}.\n`);

			// Load then watch for changes in the config file
			this.loadConfig(fs.readFileSync(process.env.CONFIG_PATH));
			fs.watchFile(process.env.CONFIG_PATH, () => {
				console.log("Config file has been changed.");
				this.loadConfig(fs.readFileSync(process.env.CONFIG_PATH));
			});

			// Load then watch for changes in the command list
			this.loadCmds(fs.readFileSync(process.env.CMDS_PATH));
			fs.watchFile(process.env.CMDS_PATH, () => {
				console.log("commands file has been changed.");
				this.loadCmds(fs.readFileSync(process.env.CMDS_PATH));
			});

			// Set the title of the "game" Screambot is "playing"
			this.client.user.setActivity(this.config.activity)
					.catch(console.error);

			console.log(); // New line

			// Start screaming in the enabled channels
			this.startScreamingEverywhere();
		});

		
		/**
		 * On Message
		 * Triggers when a message is posted in _any_ server
		 *   that Screambot is in
		 */
		this.client.on("message", message => {
			// Pinged
			if (message.isMentioned(this.client.user)) {
				if ((this.isAdmin(message.author.id)) && (message.content.includes(" "))) {
					console.log(`\nScreambot has received a command from ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`);
					this.adminCommands(message);
				} else {
					console.log(`\nScreambot has been pinged by ${message.author.username} in ${message.guild.name}/#${message.channel.name}.`);
					this.screamIn(message.channel)
							.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
							.catch(err => console.error(err));
				}
			}

			// Someone screams who is neither on the donotreply list nor Screambot itself
			if ((message.content.toUpperCase().includes("AAAAAA")) && (message.author != this.client.user) && (!this.inDoNotReply(message.author.id))) {
				console.log(`\n${message.author.username} has screamed in ${message.guild.name}/#${message.channel.name}.`);
				this.screamIn(message.channel)
						.then(message => console.log(`Responded with ${message.content.length} A's.\n`))
						.catch(err => console.error(err));
			}
		});


		/**
		 * On Guild Create
		 * Triggers when Screambot joins a server
		 */
		this.client.on("guildCreate", guild => {
			console.log(`Joined a new server: ${guild.name} (ID: ${guild.id}). There are ${guild.memberCount} users in it.`);
		});


		/**
		 * On Guild Delete
		 * Triggers when Screambot is removed from a server
		 */
		this.client.on("guildDelete", guild => {
			console.log(`Removed from server: ${guild.name} (ID: ${guild.id}).`);
		});

		// (Try to) log into Discord
		console.log("Logging in...");
		this.client.login(process.env.TOKEN);
	
	
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
			console.log("\n------------------------------------------");
			console.log(`About to exit with code: ${code}`);

			this.client.user.setActivity("SHUTTING DOWN AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
					.catch(console.error);

			console.log("Logging out...");
			this.client.destroy()
				.then(console.log("Logged out."))
				.catch(console.error);

			console.log("------------------------------------------\n");

			throw "fake error that stops execution there has to be a better way than this";
		});

	}

	
	// --- Methods -------------------------

	/**
	 * Random Scream Loop
	 * Makes a timeout loop that screams after
	 *   a random amount of time at each loop
	 * All wait times come from the config file
	 * 
	 * The fraction is the probability of a short wait
	 */
	randomScreamLoop(ch, nickname) {
		let minWait;
		let maxWait;
		if (Math.random() <= (1/5)) {
			minWait = this.config.waittimes.short.min;
			maxWait = this.config.waittimes.short.max;
		} else {
			minWait = this.config.waittimes.long.min;
			maxWait = this.config.waittimes.long.max;
		}

		const randWait = (Math.floor(Math.random() * maxWait)) + minWait;
		if (Number.isNaN(randWait)) {
			console.error("randWait is not a number.");
			return;
		}

		const waitF = this.msToMinAndSec(randWait/1000);
		console.log(`[${nickname}] Going to scream in ${waitF.minutes} minutes, ${waitF.seconds} seconds.`);

		let loop = setTimeout( () => {
			this.screamIn(ch)
					.then(message => {
						console.log(`Sent ${message.content.length} A's to #${message.channel.name}.\n`)
						this.randomScreamLoop(ch, nickname);
					})
					.catch(err => {
						console.error(err);
						clearTimeout(loop);
					});
		}, randWait);

		return loop;
	}


	/**
	 * Start Screaming In
	 * Makes a timeout loop for
	 *   the nickname's channel
	 */
	startScreamingIn(nickname) {
		let channelId = this.config.channels[nickname].id;
		if (!channelId)
			console.warn(`\nScreambot is not in any server whose name is "${nickname}" in the config file. Screambot will not scream there.`);

		let ch = this.client.channels.get(channelId);
		if (!ch)
			console.warn(`\nScreambot is not in any server that has a channel with the ID ${channelId} (labeled "${nickname}" in the config file). Screambot will not scream there.`);
		else
			ch.loop = this.randomScreamLoop(ch, nickname);
	}


	/**
	 * Start Screaming Everywhere
	 * Makes a random scream timeout
	 *   for every channel in the channels list
	 */
	startScreamingEverywhere() {
		Object.keys(this.config.channels).forEach( nickname => {
			this.startScreamingIn(nickname);
		});
	}


	/**
	 * Stop Screaming In
	 * Clears the timeout assigned to the nickname's channel's loop
	 */
	stopScreamingIn(nickname) {
		let ch = this.config.channels[nickname];
		//try {
			clearTimeout(ch.loop);
		//} catch (e) {
		//	if (!e instanceof TypeError) throw e;
		//}
	}


	/**
	 * Stop Screaming Everywhere
	 * Clears the timeout for every channel in the channels list
	 */
	stopScreamingEverywhere() {
		Object.keys(this.config.channels).forEach( nickname => {
			this.stopScreamingIn(nickname);
		});
	}


	/**
	 * Restart Scream Loop
	 * Clears and remakes the timeout assigned to
	 *   the given channel nickname
	 */
	restartScreamLoop(nickname) {
		this.stopScreamingIn(nickname);
		this.startScreamingIn(nickname);
	}


	/**
	 * Restart All Scream Loops
	 * Restarts all scream loops for every channel in the channels list
	 */
	restartAllScreamLoops() {
		Object.keys(this.config.channels).forEach( nickname => {
			this.restartScreamLoop(nickname);
		});
	}


	/**
	 * Load Config
	 * Converts a JSON-formatted string to a JS object
	 * Stores it as this.config
	 * Applies server-specific nicknames
	 */
	loadConfig(config) {
		console.log("Loading config...");
		this.config = JSON.parse(config);

		const chNames = Object.keys(this.config.channels);

		if (chNames.length == 0) {
			console.warn("No channels specified to scream in.");
		} else {
			console.log("Channels registered:");
			chNames.forEach( chName => {
				console.log(`    ${chName} (ID: ${this.config.channels[chName].id})`);
			});
			console.log();
		}


		// Server-specific nicknames
		const servernicks = Object.values(this.config.servernicks);
		const uid = this.client.user.id;
		let sn;

		this.client.guilds.tap( server => {
			sn = this.isServerNickForId(servernicks, server.id);
			if (sn != false) {
				server.members.get(uid).setNickname(sn.nickname)
						.then(console.log(`\nCustom nickname in server ${sn.id}: ${sn.nickname}.\n`))
						.catch(console.error);
			} else {
				server.members.get(uid).setNickname(this.config.name)
						.catch(console.error);
			}

		});

		console.log("Config successfully loaded.\n");
	}


	isServerNickForId(servernicks, serverId) {
		let sn;
		for (let i=0; i<servernicks.length; i++) {
			sn = servernicks[i];
			if (sn.id == serverId)
				return sn;
		}
		return false;
	}


	/**
	 * Load Commands
	 * Converts a JSON-formatted string to an object
	 * Sets it as this.cmds
	 */
	loadCmds(cmds) {
		console.log("Loading commands...");
		try { this.cmds = JSON.parse(cmds); }
		catch (err) {
			console.error("This commands file is invalid! Keeping the old commands.");
			return;
		}
		console.log("Commands successfully loaded.");
	}


	/**
	 * Generate Scream
	 * Generates a 1-100 character string of capital A's
	 * 
	 * The fraction is the probability of a small scream
	 */
	generateScream() {
		let min = 1;
		let max = 100;

		/*
		// Big scream or smol scream?
		if (Math.random() <= (3/4)) {
			min = 5;
			max = 100;
		} else {
			min = 101;
			max = 2000;
		}
		*/

		let a = Math.floor(Math.random() * (max-min)) + min;
		let scream = "";

		while (a > 0) {
			scream += "A";
			a--;
		}

		return scream;
	}


	/**
	 * Scream In
	 * Generates a scream with generateScream()
	 *   and sends it to the given channel with sayIn()
	 */
	screamIn(ch) { return new Promise( (resolve, reject) => {
		this.sayIn(ch, this.generateScream())
				.then(message => resolve(message))
				.catch(err => reject(err));
	});}


	/**
	 * Say In
	 * Sends a message to a channel
	 * Rejects if the channel is not whitelisted
	 *   or if the send command screws up 
	 */
	sayIn(ch, msg) { return new Promise( (resolve, reject) => {
		ch.send(msg)
				.then(message => resolve(message))
				.catch(err => reject(err));
				return;
	});}


	/**
	 * Is Admin
	 * Checks if the given user ID matches an admin in the config file
	 */
	isAdmin(authorId) {
		return (Object.values(this.config.admins).includes(authorId));
	}


	/**
	 * Admin Commands
	 * Parses and executes commands received from a Screambot admin
	 * Admin IDs are listed in the config file
	 * 
	 * Command syntax:
	 * "@Screambot [command] [args space delimited]"
	 */
	adminCommands(message) {
		// Split into words
		let cmd = message.content.split(" ");

		// Remove first word (which is <@screambotsid)
		cmd.shift();

		// Clone cmd to args; remove the keyword
		let args = [...cmd];
		args.shift();

		// If command matches one listed in the commands file
		Object.keys(this.cmds).forEach( keywd => {
			if (cmd[0] == keywd) {
				console.log(`Command: ${cmd.toString()}`);
				eval(`${this.cmds[keywd]}(${args.toString()});`); // Oh boy I hope no one ever sees this
			}
		});
	}


	/**
	 * MS to Minutes and Seconds
	 * Converts a millisecond value to a time object
	 * 
	 * exampleTimeObj = {
	 *   minutes: 2
	 *   seconds: 30
	 * };
	 */
	msToMinAndSec(time) {
		let timeObj = {};
		timeObj.minutes = Math.floor(time / 60);
		timeObj.seconds = Math.round(time - timeObj.minutes * 60);
		return timeObj;
	}


	/**
	 * In Do Not Reply
	 * Returns whether or not a User ID is in the
	 *   donotreply list
	 */
	inDoNotReply(userId) {
		return (Object.values(this.config.donotreply).includes(userId));
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
const screambot = new Screambot();
