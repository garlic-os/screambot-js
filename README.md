# Screambot
A Discord bot that screams. That's it.

It's still a work in progress, but it _does_ work, so if for some reason you want to use it, here's a """""guide""""" to help you get it going:
1. Decide whether you're gonna run Screambot on your own computer/a local machine, or if you'll run it on a service like Heroku or EC2
 - If you're running it locally, the `LOCAL_MODE` environment variable should be 1. Set up node.js where you'll run it and install its dependencies (discord.js, aws-sdk, console-stamp).
 - If you're running it on a cloud server, make an S3 bucket through Amazon Web Services and put `config.json` and `ranks.json` into it. Make an IAM user that has read access to it and then fill in the S3 and AWS-related environment variables. Make sure `LOCAL_MODE` is set to 0. Upload it to a service like Heroku or EC2. Set the environment variables there instead of at `.env`.
1. Make your bot on the Discord Developer Portal: https://discordapp.com/developers/applications/
2. Configure `config.json` and `ranks.json` to match what server(s) you'll put Screambot on
3. Configure the environment variables listed at the top of `index.js` (too lazy to put them here)
 - The S3 and AWS-related ones aren't necessary if you're running locally
4. Invite Screambot to your servers at https://discordapp.com/developers/applications/574092583014236160/oauth; needs permission code `67177472` and scope `bot`
5. Run it

If you take a look at it and find issues, please don't hesitate to make an issue or a pull request.
