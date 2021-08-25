const config = require("./config");

// Use the configuration file to dictate behavior on encountering an error
if (config.CRASH_ON_ERROR) {
	process.on("unhandledRejection", logError);
} else {
	process.on("unhandledRejection", up => { throw up });
}

// Overwrite console methods with empty ones if logging is disabled
if (config.DISABLE_LOGS) {
    for (const method in console) {
        console[method] = () => {};
    }
} else {
	require("console-stamp")(console);
}

const log = {
	say:    message => console.log(`${locationString(message)} Sent the message, "${message.content}".`),
	scream: message => console.log(`${locationString(message)} Sent a ${message.content.length}-character long scream.`),
	screamReply: message => console.log(`Replied with a ${message.content.length} A's.\n`),
	error:  message => console.log(`${locationString(message)} Sent the error message, "${message.content}".`),
	rateLimited: () => console.log("Wanted to scream, but was rate limited."),
};

const Discord = require("discord.js");
const client = new Discord.Client();


/**
 * Rate limiting. While true, Screambot will drop all requests to scream.
 * @type {Boolean}
 */
let rateLimiting = false


client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag}.\n`);

	// Unlock rate limit every interval
	setInterval( () => {
		rateLimiting = false;
	}, config.RATE_LIMIT_MS);

	updateNicknames(config.NICKNAMES);

	client.user.setActivity("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
		.then( ({ activities }) => console.log(`Activity set: ${activities[0].name}`));

	channelTable(config.CHANNELS).then(table => {
		console.info("Channels:")
		console.table(table)
	})
	.catch(console.warn);

	nicknameTable(config.NICKNAMES).then(table => {
		console.info("Nicknames:")
		console.table(table)
	})
	.catch(console.warn);
});


client.on("message", message => {
	if (!inDoNotReply(message.author.id) && ( // Not in the Do-Not-Reply list
			canScreamIn(message.channel.id) || // Is in either a channel Screambot is allowed in,
			message.channel.type === "dm")) { // or a DM channel
	
		// Pinged
		if (message.mentions.has(client.user)) {
			if (!command(message)) {
				console.log(`${locationString(message)} Pinged by ${message.author.tag}.`);

				screamIn(message.channel)
					.then(log.screamReply)
					.catch(log.rateLimited);
			}
		}

		// Someone screams
		else if (isScream(message.content)) {
			console.log(`${locationString(message)} ${message.author.tag} has screamed.`);
			screamIn(message.channel)
				.then(log.screamReply)
				.catch(log.rateLimited);
		}

		// Always scream at DMs
		else if (message.channel.type === "dm") {
			console.log(`[Direct message] Received a DM from ${message.author.tag}.`);
			screamIn(message.channel)
				.then(log.screamReply)
				.catch(log.rateLimited);
		}
		
		// If the message is nothing special, maybe scream anyway
		else {
			if (randomReplyChance()) {
				console.log(`${locationString(message)} Randomly decided to reply to ${message.author.tag}'s message.`);
				screamIn(message.channel)
					.then(log.screamReply)
					.catch(log.rateLimited);
			}
		}
	}
})


/**
 * On Guild Create
 * Triggers when Screambot joins a server
 */
client.on("guildCreate", guild => {
	const embed = new Discord.MessageEmbed()
		.setAuthor("Added to a server.")
		.setTitle(guild.name)
		.setDescription(guild.id)
		.setThumbnail(guild.iconURL)
		.addField(`Owner: ${guild.owner.user.tag}`, `${guild.ownerID}\n\n${guild.memberCount} members`)
		.addBlankField();

	let logmsg = `-------------------------------
Added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
Channels:`;

	/**
	 * Add an inline field to the embed and a
	 *   line to the log message
	 *   for every text channel in the guild.
	 */
	guild.channels.cache.each(channel => {
		if (channel.type === "text") {
			embed.addField(`#${channel.name}`, channel.id, true);
			logmsg += `\n#${channel.name} (ID: ${channel.id})`;
		}
	});

	logmsg += "\n-------------------------------";
	dmTheDevs(embed);
	console.info(logmsg);
});


/**
 * On Guild Delete
 * Triggers when Screambot is removed from a server
 */
client.on("guildDelete", guild => {
	const msg = `-------------------------------
Removed from a server.
${guild.name} (ID: ${guild.id})
-------------------------------`;
	dmTheDevs(msg);
	console.info(msg);
});


// Log into Discord
console.log("Logging in...");
client.login(config.DISCORD_BOT_TOKEN);


// --- Functions -------------------------


/**
 * Sets the custom nicknames from config
 * 
 * @return {Promise<void|Error[]>} Resolve: nothing (there were no errors); Reject: array of errors
 */
async function updateNicknames(nicknameDict) {
	const errors = [];

	for (const serverName in nicknameDict) {
		const [ serverID, nickname ] = nicknameDict[serverName];
		const server = client.guilds.cache.get(serverID);
		if (!server) {
			console.warn(`Nickname configured for a server that Screambot is not in. Nickname could not be set in ${serverName} (${serverID}).`);
			continue;
		}
		server.me.setNickname(nickname)
			.catch(errors.push);
	}

	if (errors.length > 0) {
		throw errors;
	} else {
		return;
	}
}


/**
 * 
 a scream with random variations.
 * 
 * @return {string} scream
 */
function generateScream() {
	/**
	 * Random outcome with a <percent>% chance of being True.
	 * 
	 * @param {number} percent
	 * @return {Boolean}
	 */
	function chance(percent) {
		return Math.random() < percent / 100;
	}

	/**
	 * Pick a random element from an array.
	 * 
	 * @param {any[]} choices
	 * @return {any} random element from choices
	 */
	function choose(choices) {
		const index = Math.floor(Math.random() * choices.length);
		return choices[index];
	}


	const min = 1;
	const max = 100;
	const bodyLength = Math.floor(Math.random() * (max-min)) + min;


	// Vanilla scream half the time
	if (chance(50)) {
		return "A".repeat(bodyLength);
	}

	const body = choose(["A", "O"]).repeat(bodyLength);

	// Chance to wrap the message in one of these Markdown strings
	const formatter = chance(50) ? "" : choose(["*", "**", "***"]);

	// Chance to put one of these at the end of the message
	const suffix = chance(50) ? "" : choose(["H", "RGH", "ER"]);

	// Example: "**AAAAAAAAAAAARGH**"
	let text = formatter + body + suffix + formatter;

	if (chance(12.5)) {
		text = text.toLowerCase();
	}

	return text;
}


/**
 * Return true RANDOM_REPLY_CHANCE percent of the time.
 * 
 * @return {boolean} whether to reply or not
 */
function randomReplyChance() {
	return Math.random() * 100 <= config.RANDOM_REPLY_CHANCE;
}


/**
 * Generate a scream with generateScream()
 *   and send it to the given channel with sayIn().
 * 
 * @param {Channel} channel - channel to scream in
 * @return {Promise<DiscordMessage>} message that was sent
 */
async function screamIn(channel) {
	if (rateLimiting) {
		throw "Rate limited";
	}
	rateLimiting = true;
	return await sayIn(channel, generateScream());
}


/**
 * Send a message to a channel.
 * Reject if the channel is not whitelisted.
 * 
 * @param {Channel} channel - channel to send the message to
 * @param {string} string - message to send
 * @return {Promise<DiscordMessage>} message that was sent
 */
async function sayIn(channel, string) {
	if (canScreamIn(channel.id) || channel.type === "dm")
		return await channel.send(string);

	throw `Not allowed to scream in [${channel.guild.name} - #${channel.name}].`;
}


/**
 * Is [val] in [obj]?
 * 
 * @param {any} val
 * @param {Object} object
 * @return {boolean}
 */
function has(val, obj) {
	for (const key in obj) {
		if (obj[key] === val)
			return true;
	}
	return false;
}


function canScreamIn(channelID) {
	return has(channelID, config.CHANNELS);
}


function isAdmin(userID) {
	return has(userID, config.ADMINS);
}


function isDev(userID) {
	return has(userID, config.DEVS);
}


function inDoNotReply(userID) {
	return has(userID, config.DO_NOT_REPLY) || userID === client.user.id;
}


/**
 * Parse and execute a command from an admin or a dev.
 * 
 * Command syntax:
 * "@Screambot [command] [args space delimited]"
 * 
 * @param {DiscordMessage} message - message object to get the necessary command information from
 * @return {boolean} command was executed
 */
function command(message) {
	try {
		const authorID = message.author.id;

		if (!(message.content.includes(" ") // Message has to have a space (more than one word)
		&& (isAdmin(authorID) || isDev(authorID)))) { // and come from an admin or dev
			return false;
		}
		
		console.log(`${locationString(message)} Received a command from ${message.author.tag}.`);

		const args = message.content.split(" ");
		args.shift(); // Remove "@Screambot"
		const command = args.shift().toLowerCase();

		// -- COMMANDS --
		const commands = {
			say: () => {
				sayIn(message.channel, args.join(" "))
					.then(log.say);
			},


			sayin: async () => {
				const channelID = args[0];
				let channel;

				try {
					channel = await client.channels.fetch(channelID);
				} catch (e) {}

				if (channel) {
					args.shift(); // Remove first argument (the channel ID)
					sayIn(channel, args.join(" "))
						.then(log.say);
				} else {
					sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SPEAK THERE AAAAAAAAAAAAAA")
						.then(log.error);
				}
			},


			screamin: async () => {
				let channel;

				try {
					channel = await client.channels.fetch(channelID);
				} catch (e) {}

				if (channel) {
					screamIn(channel)
						.then(log.scream)
						.catch(log.rateLimited);
				} else {
					sayIn(message.channel, "AAAAAAAAAAAAAA I CAN'T SCREAM THERE AAAAAAAAAAAAAA")
						.then(log.error);
				}
			},


			servers: () => {
				const embed = new Discord.MessageEmbed()
					.setTitle("Member of these servers");

				client.guilds.cache.each(server => {
					embed.addField(server.name, server.id, true);
				});

				message.author.send(embed)
					.then(console.log(`${locationString(message)} Listed servers.`));
			},
		};

		const valid = commands.hasOwnProperty(command);

		if (valid) {
			commands[command]();
		}

		return valid;

	} catch (err) {
		logError(`A command caused an error: ${message}\n${err}`);
	}
}



/**
 * DM the dev(s) and console.error a message.
 * For nonfatal errors.
 * 
 * @param {Error|string} errObj - error object or string
 */
function logError(errObj) {
	console.error(errObj);
	(errObj.message)
		? dmTheDevs(`ERROR! ${errObj.message}`)
		: dmTheDevs(`ERROR! ${errObj}`);
}


/**
 * DM someone.
 * 
 * @param {User} user - User to DM
 * @param {string} string - message to send
 * @return {Promise<{user, string}>} object containing the input arguments
 */
async function dm(user, string) {
	if (!user) {
		throw `User does not exist.`;
	}
	await user.send(string);
	return { user, string };
}


/**
 * Send a DM to everyone in the dev list.
 * 
 * @param {string} string - message to send
 * @return {Promise<void>}
 */
async function dmTheDevs(string) {
	if (config.DEVS) {
		for (const key in config.DEVS) {
			const user = await client.users.fetch(config.DEVS[key]);
			dm(user, string)
				.catch(console.error);
		}
	} else {
		console.error(`-------------------------------
           Tried to DM the devs before the
		   dev list has been initialized. 
		   This is not good.
           -------------------------------`);
	}
}


/**
 * Does the string contain a scream?
 * 
 * @param {string} text
 * @return {boolean}
 */
function isScream(text) {
	return text.toUpperCase().includes("AAA");
}


/**
 * A syntactic shortcut for when a
 *   callback or promise from a message 
 *   wants to log where Screambot sent
 *   a message.
 * 
 * @param {DiscordMessage} - message object to get the location information from
 * @return {string} formatted string showing the origin of the message
 */
function locationString(message) {
	return (message.channel.type === "dm")
		? `[Direct message]`
		: `[${message.guild.name} - #${message.channel.name}]`;
}


/**
 * Generate an object containing stats about
 *   all the channels in the given dictionary.
 * 
 * @param {Object} channelDict - Dictionary of channels
 * @return {Promise<Object>} Resolve: Object intended to be console.table'd
 * 
 * @example
 *     channelTable(config.SPEAKING_CHANNELS)
 *         .then(console.table)
 */
async function channelTable(channelDict) {
	if (config.DISABLE_LOGS) {
		return {};
	}
	
	if (isEmpty(channelDict)) {
		throw "No channels are whitelisted.";
	}

	const stats = {};
	for (const key in channelDict) {
		const channelID = channelDict[key];
		const channel = await client.channels.fetch(channelID);
		const stat = {};
		stat["Server"] = channel.guild.name;
		stat["Name"] = "#" + channel.name;
		stats[channelID] = stat;
	}
	return stats;
}


/**
 * Generate an object containing stats about
 *   all the nicknames Screambot has.
 * 
 * @param {Object} nicknameDict - Dictionary of nicknames
 * @return {Promise<Object>} Object intended to be console.table'd
 * 
 * @example
 *     nicknameTable(config.NICKNAMES)
 *         .then(console.table)
 */
async function nicknameTable(nicknameDict) {
	if (config.DISABLE_LOGS) {
		return {};
	}
	
	if (isEmpty(nicknameDict)) {
		throw "No nicknames defined.";
	}

	const stats = {};
	for (const serverName in nicknameDict) {
		const [ serverID, nickname ] = nicknameDict[serverName];
		const server = client.guilds.cache.get(serverID);
		const stat = {};
		stat["Server"] = server.name;
		stat["Intended"] = nickname;
		stat["De facto"] = server.me.nickname;
		stats[serverID] = stat;
	}
	return stats;
}


/**
 * Does the object have anything in it?
 * 
 * @param {Object} obj
 * @return {boolean}
 */
function isEmpty(obj) {
	for (const key in obj) {
		if (obj.hasOwnProperty(key))
    		return false;
		}
	return true;
}


/**
 * Get a status name from status code.
 * 
 * @param {number} code - status code
 * @return {string} status name
 */
function status(code) {
	return ["Playing", "Streaming", "Listening to", "Watching"][code];
}
