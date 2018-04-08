const request = require('request-promise-native');
const inquirer = require('inquirer');
const ProgressBar = require('progress');

const ENDPOINT = 'https://discordapp.com/api/v6/';
var headers = {};

async function getMessages(type, target, user) {
  return JSON.parse(await request({
    'url': ENDPOINT + type + 's/' + target + '/messages/search?author_id=' + user + '&include_nsfw=true',
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

async function removeMessages(type, target, user){
  let bar;

  while (true) {
    let res = await getMessages(type, target, user);
    if (res.hasOwnProperty('document_indexed') && res.document_indexed == 0) {
      console.log('Not indexed yet. Retrying after 2 seconds.');
      await sleep(2000);
      continue;  
    }

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

  answers = await inquirer.prompt([
    {
      'type': 'list',
      'name': 'type',
      'message': 'What would you like to delete?',
      'choices': [{
        'value': 'guild',
        'name': 'Guild messages'
      },
      {
        'value': 'channel',
        'name': 'DMs'
      }]
    }
  ]);

  let type = answers.type;

  let targets = JSON.parse(await request({
    'url': ENDPOINT + '/users/@me/' + type + 's',
    'headers': headers
  }));

  targets = targets.map(x => {
    x.value = x.id;

    if (type == 'channel') {
      x.name = x.recipients.reduce(
        (acc, y, i) => (i != 0 ? acc + ', ' : '') + y.username + '#' + y.discriminator,
      "");
    }

    return x;
  });

  answers = await inquirer.prompt([
    {
      'type': 'list',
      'name': 'target',
      'message': type,
      'choices': targets
    }
  ]);

  let target = answers.target;
  answers = await inquirer.prompt([
    {
      'type': 'confirm',
      'name': 'confirm',
      'message': 'Are you sure? This will delete all of your messages.',
      'default': false
    }
  ]);

  if (answers.confirm) {
    await removeMessages(type, target, user.id);
  }
}

userInput();