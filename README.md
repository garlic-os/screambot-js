# Screambot
A Discord bot that screams. That's it.

Screams when:
- Pinged
- Someone else screams
- Someone says something (sometimes)

## Run it yourself
Screambot still very much a work in progress, but it _does_ work. I am working toward getting it to a state where you can just invite it to your server without worrying about hosting it yourself, but if for some reason you want to use it now, here's a guide:
### Run it on your own machine
1. Download it
2. Open a command line (maybe do the following as part of a batch file)
3. Set the environment variables listed below
4. `node index.js`

### Run it on a PaaS
1. If you haven't already, set up an account with a service that lets you run code on one of their servers. I recommend Heroku or EC2.
2. Make a project and link it to this GitHub page (or download it and upload the source manually)
3. Set the environment variables
4. Use **worker** type. **Do not** use web type. 


## Environment variables
| Name | Description | Example |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | The token you get when you make a Discord bot. discord.js uses this to log in. | `GEJG8tOVnw2Hyh4Olu.sBxf2FyEaQJ.cMq.lfsLzrSIzMFNf9d3qTqxRrnq` |
| `CHANNELS` | A JSON-encoded dictionary of the channels Screambot is allowed to scream in. | `{"random server name or whatever you want - #general":"<CHANNEL ID HERE>"}` |
| `NICKNAMES` | A JSON-encoded dictionary of any server-specific nicknames Screambot has. | `"a server": ["<SERVER ID HERE>", "Screamy Boye"]` |
| `ADMINS` | A JSON-encoded dictionary of the users that are allowed to use Screambot's admin commands. | `{"Your friend":"<USER ID HERE>"}` |
| `DEVS` | A JSON-encoded dictionary of the users that are allowed to use Screambot's dev commands. | `{"You, probably":"<USER ID HERE>"}` |
| `DO_NOT_REPLY` | A JSON-encoded dictionary of the users that Screambot won't reply to. | `{"Naughty boy":"<USER ID HERE>"}` |
| `RANDOM_REPLY_CHANCE` | Percent chance that Screambot will scream in response to a regular message | `0.5` |

## TODO
- Scream in VC: https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md
- Put the functions in a sensible order
- Ranks: go by server role IDs, when possible, instead of user IDs
- Make things more asynchronous
- Add scream variations (maybe?)
- Make a "help" command
- Make the code for responding to pings not garbage
- Schedule different messages for certain dates
- Change scream on the fly, per server


## Thanks
I couldn't have done this without:
- Mozilla Developer Network Web Docs: https://developer.mozilla.org/en-US/
- discord.js and its documentation: https://discord.js.org/#/
- Inspiration and encouragement from friends and family
- node.js lol
- Viewers like you
  - Thank you

---

If you take a look at it and you find something I should change, please don't hesitate to make an issue or a pull request.
