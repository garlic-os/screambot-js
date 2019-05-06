
/**
 *  Screambot
 *  A Discord bot that screams
 *  Screams when:
 *    - Pinged
 *    - Someone else screams
 *    - It feels like it
 * 
 *  TODO:
 *    - Automatically connect to a voice chat (at least once a week) and repeatedly play screaming sounds
 */

const fs = require("fs");
const Discord = require("discord.js");

class Screambot {
	constructor() {
		console.log("Screambot instantiated.");
		this.client = new Discord.Client();
		this.enabledChannels = new Map();
		this.loadConfig();

		// Logged in
		this.client.on("ready", async () => {
			console.log(`Logged in as ${this.client.user.tag}.\n`);
			this.applyConfig();
			this.setActivity(this.config.activity);
			console.log();
			this.startScreamingEverywhere();
		});

		// Someone posts a message
		this.client.on("message", async message => {
			// Pinged
			if (message.isMentioned(this.client.user)) {
				console.log(`Screambot has been pinged by ${message.author.username} in ${message.guild.name}/#${message.channel.name}.Responding.`);
				this.screamIn(message.channel);
			}

			// Someone (not itself) screams
			if ((message.content.toUpperCase().includes("AAAAAA")) && (message.author != this.client.user)) {
				console.log(`${message.author.username} has screamed in ${message.guild.name}/#${message.channel.name}. Responding.`);
				this.screamIn(message.channel);
			}
		});


		// Added to a server
		this.client.on("guildCreate", async guild => {
			console.log(`Joined a new server: ${guild.name} (ID: ${guild.id}). There are ${guild.memberCount} users in it.`);
		});


		// Removed from a server
		this.client.on("guildDelete", async guild => {
			console.log(`Removed from server: ${guild.name} (ID: ${guild.id}).`);
		});

		// (Try to) log into Discord
		console.log("Logging in...");
		this.client.login(this.config.token);

		// process.exit() is called
		process.on('exit', code => {
			console.log("\n--------------------------------");
			console.log(`About to exit with code: ${code}`);

			console.log("Logging out...");
			this.client.destroy()
				.then(console.log("Logged out."))
				.catch(console.error);

			console.log("--------------------------------\n");
		});

	}

	
	// --- Methods -------------------------


	isWhitelisted(channelId) {
		return (this.config.whitelist.includes(channelId)) ? true : false;
	}

	async randomScreamLoop(nickname) {
		/* Scream after a random amount of time, indefinitely */
		let ch = this.enabledChannels.get(nickname);

		let minWait;
		let maxWait;
		if (Math.random() >= .5) {
			minWait = this.config.waittimes[0][0];
			maxWait = this.config.waittimes[0][1];
		} else {
			minWait = this.config.waittimes[1][0];
			maxWait = this.config.waittimes[1][1];
		}

		const randWait = (Math.floor(Math.random() * maxWait)) + minWait;
		const waitF = this.msToMinAndSec(randWait/1000);
		console.log(`[ ${nickname} (ID: ${ch.id}) ] Going to scream in ${waitF.minutes} minutes, ${waitF.seconds} seconds.`);

		return setTimeout( () => {
			this.screamIn(ch);
			this.randomScreamLoop(nickname);
		}, randWait);
	}

	addChannel(nickname, channelId) {
		if (!this.isWhitelisted(channelId)) {
			console.error(`[ ${nickname} ] Channel with ID ${channelId} is not whitelisted.`);
			return false;
		}

		this.enabledChannels.set(
				nickname,
				this.client.channels.get(channelId)
		);

		return true;
	}

	removeChannel(nickname) {
		this.stopScreamingIn(this.enabledChannels.get(nickname));
		this.enabledChannels.delete(nickname);
	}

	enabledChannelsToString() {
		let outputStr = `Enabled channels:\n`;
		this.enabledChannels.forEach( (ch, nickname) => {
			outputStr += `    ${nickname} | ${ch.id}`;
		});
		return outputStr + `\n`;
	}

	async startScreamingIn(nickname) {
		let ch = this.enabledChannels.get(nickname);
		ch.promise = this.randomScreamLoop(nickname);
	}

	async startScreamingEverywhere() {
		this.enabledChannels.forEach( async (ch, nickname) => {
			this.startScreamingIn(nickname);
		});
	}

	async stopScreamingIn(nickname) {
		let ch = this.enabledChannels.get(nickname);
		if (ch.promise) clearTimeout(ch.promise);
	}

	async stopScreamingEverywhere() {
		this.enabledChannels.forEach( (ch, nickname) => {
			this.stopScreamingIn(nickname);
		});
	}

	async restartScreamLoop(nickname) {
		this.stopScreamingIn(nickname);
		this.startScreamingIn(nickname);
	}

	async restartAllScreamLoops() {
		this.enabledChannels.forEach( (ch, nickname) => {
			this.restartScreamLoop(nickname);
		});
	}

	loadConfig() {
		this.config = JSON.parse(fs.readFileSync("config.json"));
	}

	applyConfig() {
		this.updateEnabledChannels();
		console.log(`Wait times:\n${this.config.waittimes}\n`);
	}

	refresh() {
		this.loadConfig();
		if (this.applyConfig()) this.restartAllScreamLoops();
	}

	shutdown(exitCode) {
		exitCode = exitCode || 0;
		process.exit(exitCode);
	}

	generateScream(min, max) {
		min = min || 5;
		max = max || 2000;
		let a = (Math.random() * max) + min;
		let scream = "";

		while (a > 0) {
			scream += "A";
			a--;
		}

		return scream;
	}

	screamIn(ch) {
		/* Send a message to channel ch with a random number of A's */
		this.sayIn(ch, this.generateScream());
	}

	sayIn(ch, msg) {
		if (this.isWhitelisted(ch.id)) {
			ch.send(msg)
					.then(message => console.log(`Sent message: ${message.content}\n`))
					.catch(console.error);
			return true;
		}

		console.error(`Channel "${ch.name}" (ID: ${ch.id}) is not whitelisted.`);
		return false;
	}

	updateEnabledChannels() {
		for (let entry of this.config.enabled) {
			let name = entry[0];
			let id = entry[1];

			this.enabledChannels.forEach( (value, key) => {
				this.removeChannel(key);
			});

			if (this.isWhitelisted(id))
				this.addChannel(name, id);
			else
				console.error(`Channel ${name} (ID: ${id}) is not whitelisted. Screambot has no permission and must scream.`);

			console.log(this.enabledChannelsToString());
		}
	}

	getActivity() { return this.client.user.localPresence.game.name; }
	setActivity(activity) {
		this.client.user.setActivity(activity)
				.then(console.log(`Activity: "${this.getActivity()}".`))
				.catch(console.error);
	}

	msToMinAndSec(time) {
		let timeObj = {};
		timeObj.minutes = Math.floor(time / 60);
		timeObj.seconds = Math.round(time - timeObj.minutes * 60);
		return timeObj;
	}

}


const screambot = new Screambot();
