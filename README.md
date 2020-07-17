# Screambot
A Discord bot that screams. That's it.

Screams when:
- Pinged
- Someone else screams
- Someone says something (sometimes)

## Run it yourself
Screambot is not currently in a state where you can just invite it to your server like you can with most bots. If you want to get it running, you will have to get your hands a little dirty:
### Run it on your own machine
1. Download or clone this repository.
2. Fill in your `config.js`.
3. In a command line, do `npm install` then `npm start`.

### Run it on a PaaS
1. If you haven't already, set up an account with a service that lets you run code on their servers (a platform as a service). Popular choices include [Heroku](https://www.heroku.com/home), [Elastic Beanstalk](https://aws.amazon.com/es/elasticbeanstalk/), and [Digital Ocean](https://www.digitalocean.com/).
2. Download this repository.
3. Complete the `config.js` file.
4. Create an app on the PaaS of your choice. Use **worker** type. **Do not** use web type. 
5. Upload the code to the app and start it up.


## TODO
- Scream in VC: https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md
- Put the functions in a sensible order
- Ranks: go by server role IDs, when possible, instead of user IDs
- ~~Add scream variations (maybe?)~~ Scream variations added!
- Make a "help" command
- Make the code for responding to pings not garbage
- Schedule different messages for certain dates
- ~~Change scream on the fly, per server~~ nah


## Thanks
I couldn't have done this without:
- Mozilla Developer Network Web Docs: https://developer.mozilla.org/en-US/
- discord.js and its documentation: https://discord.js.org/#/
- Inspiration and encouragement from friends and family
- node.js lol
- Viewers like you
  - Thank you

---

If you take a look at the code and you find something I should change, please don't hesitate to make an issue or a pull request.
