# Screambot
A Discord bot that screams. That's it.

Screams when:
- Pinged
- Someone else screams
- Someone says something (sometimes)

## """""guide"""""
Screambot still very much a work in progress, but it _does_ work. I am working toward getting it to a state where you can just invite it to your server without worrying about hosting it yourself, but if for some reason you want to use it now, here's a guide <sup>(that I made in 2 minutes)</sup> to help you get it going in its current state:
1. Decide whether you're gonna run Screambot on your own computer/a local machine, or if you'll run it on a service like Heroku or EC2
 - If you're running it locally, the `LOCAL_MODE` environment variable should be 1. Set up node.js where you'll run it and install its dependencies (discord.js, aws-sdk, console-stamp).
 - If you're running it on a cloud server, make an S3 bucket through Amazon Web Services and put `config.json` and `ranks.json` into it. Make an IAM user that has read access to it and then fill in the S3 and AWS-related environment variables. Make sure `LOCAL_MODE` is set to 0. Upload it to a service like Heroku or EC2. Set the environment variables there instead of at `.env`.
2. Make your bot on the Discord Developer Portal: https://discordapp.com/developers/applications/
3. Configure `config.json` and `ranks.json` to match what server(s) you'll put Screambot on
4. Configure the environment variables listed at [below](./#Environment%20variables)
 - The S3 and AWS-related ones aren't necessary if you're running locally
5. Invite Screambot to your servers at https://discordapp.com/developers/applications/574092583014236160/oauth; needs permission code `67177472` and scope `bot`
6. Run it


## Environment variables
| Name | Description |
| --- | --- |
| DISCORD_BOT_TOKEN | The token you get when you make a Discord bot. discord.js uses this to log in. |
| S3_BUCKET_NAME | The name of the S3 bucket Screambot will look for files in. |
| AWS_ACCESS_KEY_ID | The credentials for a user that can access the specified S3 bucket. |
| AWS_SECRET_ACCESS_KEY | Like part 2 for above?? idk completely how this works tbh but you need them both. |
| CONFIG_FILENAME | The name of the file on the designated S3 bucket. |
| RANKS_FILENAME | CONFIG_FILENAME, but for the ranks file. |
| LOCAL_MODE | <ul><li>When 1, CONFIG_FILENAME and RANKS_FILENAME point to files on the same machine as Screambot instead of an S3 bucket. Useful for when you just want to run it on your own computer, instead of on a server like Heroku. S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY won't be used and don't need to be specified.</li><li>When 0, CONFIG_FILENAME and RANKS_FILENAME point to files on the given S3 bucket. Necessary for when running from a cloud server like Heroku. S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY must be filled out.</li></ul> |

## TODO
Things I need to do, in no particular order:
- Scream in VC: https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md
- Put the functions in a sensible order
- Ranks: go by server role IDs, when possible, instead of user IDs
- Make things more asynchronous
- Add scream variations (maybe?)
  - Ending h's
  - Ending rgh
  - Ending punctuation
  - Beginning lowercase a's
  - Beginning o's
  - o's instead of a's
- Make a "help" command
- Merge ranks.json with config.json?
- Make the code for responding to pings not garbage
- Schedule different messages for certain dates: https://repl.it/@Garlic_OS/temporarily
- Change scream on the fly, per server
- Fix the "update" command
- Rework Screambot to use different configurations on each server (very important, need to focus on this)
- Make configuration fully editable from chat commands (also important)
- Rework config and ranks variables to use Maps instead of plain Objects (maybe?)


## Thanks
I couldn't have done this without:
- Mozilla Developer Network Web Docs: https://developer.mozilla.org/en-US/
- discord.js and its documentation: https://discord.js.org/#/
- Inspiration and encouragement from friends and family
- node.js lol
- Viewers like you
  - Thank you


If you take a look at it and you find something I should change, please don't hesitate to make an issue or a pull request.
