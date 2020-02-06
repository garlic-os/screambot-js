"use strict"

const { RichEmbed } = require("discord.js")

const embedColors = (process.env.EMBED_COLORS)
	? JSON.parse(process.env.EMBED_COLORS)
	: require("./defaults").EMBED_COLORS



/**
 * Generate a Discord Rich Embed message.
 * 
 * @param {string} str - message to print
 * @param {string} [title="SCREAMBOT"] - embed title
 * @return {RichEmbed} Discord Rich Embed object
 */
function standard(str, title="SCREAMBOT") {
	return new RichEmbed()
		.setColor(embedColors.normal)
		.addField(title, str)
}


/**
 * Generate a Discord Rich Embed error message.
 * 
 * @param {string} err - Error to print
 * @return {RichEmbed} Discord Rich Embed object
 */
function error(err) {
	return new RichEmbed()
		.setColor(embedColors.error)
		.addField("Error", err)
}


module.exports = {
	standard: standard,
	error: error
}
