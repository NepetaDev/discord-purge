const request = require('request-promise-native');
const inquirer = require('inquirer');
const ProgressBar = require('progress');

const ENDPOINT = 'https://discordapp.com/api/v6/';
var headers = {};

async function getMessages(guild, user) {
  return JSON.parse(await request({
    'url': ENDPOINT + 'guilds/' + guild + '/messages/search?author_id=' + user + '&include_nsfw=true',
    'headers': headers
  }));
}

async function removeMessage(channel_id, id) {
  await request({
    'method': 'DELETE',
    'url': ENDPOINT + 'channels/' + channel_id + '/messages/' + id,
    'headers': headers
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function removeMessages(guild, user){
  let bar;

  while (true) {
    let res = await getMessages(guild, user);
    let messages = res.messages;

    if (!bar) { 
      bar = new ProgressBar(':bar :percent :current/:total eta: :eta s', { total: res.total_results });
    }

    if (messages.length == 0 || res.total_results == 0) {
      console.log('Done!');
      return;
    }
    
    messages = messages.map(x => {
      return x.reduce((acc, val) => {
        if (val.hit) return val;
        else return acc;
      });
    });

    for (var i = 0; i < messages.length; i++) {
      await removeMessage(messages[i].channel_id, messages[i].id);
      await sleep(200);
      bar.tick();
    }
  }
}

async function userInput() {
  var answers = await inquirer.prompt([{
    'type': 'input',
    'name': 'token',
    'message': 'Token'
  }]);

  headers = {
    'Authorization': answers.token
  };

  let user = JSON.parse(await request({
    'url': ENDPOINT + '/users/@me',
    'headers': headers
  }));

  console.log('Logged in as: ' + user.username + '#' + user.discriminator);

  let guilds = JSON.parse(await request({
    'url': ENDPOINT + '/users/@me/guilds',
    'headers': headers
  }));

  guilds = guilds.map(x => {
    x.value = x.id;
    return x;
  });

  answers = await inquirer.prompt([
    {
      'type': 'list',
      'name': 'guild',
      'message': 'Guild',
      'choices': guilds
    },
    {
      'type': 'confirm',
      'name': 'confirm',
      'message': 'Are you sure? This will delete all of your messages.',
      'default': false
    }
  ]);

  if (answers.confirm) {
    await removeMessages(answers.guild, user.id);
  }
}

userInput();