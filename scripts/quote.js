// Description:
//   Remember messages and quote them back
//
// Dependencies:
//   "underscore": "~1.7.0"
//   "natural": "~0.1.28"
//
// Configuration:
//   HUBOT_QUOTE_CACHE_SIZE=N - cache the last N messages for each user (default 25)
//   HUBOT_QUOTE_STORE_SIZE=N - remember at most N messages for each user (default 100)
//
// Commands:
//   hubot remember <user> <text> - remember most recent message from <user> containing <text>
//   hubot forget <user> <text> - forget most recent remembered message from <user> containing <text>
//   hubot quote <user> [<text>] - quote a random remembered message from <user> containing <text>
//   hubot quotemash [<text>] - quote some random remembered messages containing <text>
//
// Author:
//   b3nj4m

var _ = require('underscore');
var natural = require('natural');

var stemmer = natural.PorterStemmer;

var CACHE_SIZE = process.env.HUBOT_QUOTE_CACHE_SIZE ? parseInt(process.env.HUBOT_QUOTE_CACHE_SIZE) : 25;
var STORE_SIZE = process.env.HUBOT_QUOTE_STORE_SIZE ? parseInt(process.env.HUBOT_QUOTE_STORE_SIZE) : 100;

function uniqueStems(text) {
  return _.unique(stemmer.tokenizeAndStem(text));
}

var messageTmpl = _.template('<%- user.name %>: <%- text %>');
var notFoundTmpl = _.template('"<%- text %>" not found');

function messageToString(message) {
  return messageTmpl(message);
}

function notFoundMessage(text) {
  return notFoundTmpl({text: text});
}

function serialize(data) {
  try {
    string = JSON.stringify(data);
  }
  catch (err) {
    //emit error?
  }

  return string;
}

function deserialize(string) {
  try {
    data = JSON.parse(string);
  }
  catch (err) {
    //emit error?
  }

  return data;
}

function robotStore(robot, key, data) {
  return robot.brain.set(key, serialize(data));
}

function robotRetrieve(robot, key) {
  return deserialize(robot.brain.get(key));
}

function stemMatches(searchStems, msg) {
  //cache stems on message
  msg.stems = msg.stems || uniqueStems(msg.text);
  //require all stems to be present
  return _.intersection(searchStems, msg.stems).length === searchStems.length;
}

function findAllStemMatches(messageTable, text, users) {
  var stems = uniqueStems(text);
  var userIds = users ? _.pluck(users, 'id') : _.keys(messageTable);

  return _.flatten(_.map(userIds, function(userId) {
    if (messageTable[userId] === undefined) {
      return [];
    }
    else {
      return _.filter(messageTable[userId], stemMatches.bind(this, stems));
    }
  }));
}

function findFirstStemMatch(messageTable, text, users) {
  var userIds = users ? _.pluck(users, 'id') : _.keys(messageTable);
  var message = null;
  var messageIdx = null;
  var userId = null;

  var stems = uniqueStems(text);

  _.find(userIds, function(usrId) {
    userId = usrId;

    if (messageTable[userId] === undefined) {
      return false;
    }
    else {
      message = _.find(messageTable[userId], function(msg, idx) {
        messageIdx = idx;
        return stemMatches(stems, msg);
      });

      return !!message;
    }
  });

  if (message) {
    return {
      message: message,
      messageIdx: messageIdx,
      userId: userId
    };
  }

  return null;
}

module.exports = function(robot) {
  var store = robotStore.bind(this, robot);
  var retrieve = robotRetrieve.bind(this, robot);

  robot.brain.setAutoSave(true);

  var messageCache = retrieve('quoteMessageCache');
  if (!messageCache) {
    store('quoteMessageCache', {});
  }

  var messageStore = retrieve('quoteMessageStore');
  if (!messageStore) {
    store('quoteMessageStore', {});
  }

  var hubotMessageRegex = new RegExp('^[@]?' + robot.name + '[:,]?\\s', 'i');

  robot.respond(/remember (\w*) (.*)/i, function(msg) {
    var username = msg.match[1];
    var text = msg.match[2];

    var messageCache = retrieve('quoteMessageCache');
    var messageStore = retrieve('quoteMessageStore');

    //TODO search for users in messageStore in case they've been removed? (name change implications?)
    var users = robot.brain.usersForFuzzyName(username);

    var match = findFirstStemMatch(messageCache, text, users);

    if (match) {
      messageStore[match.userId] = messageStore[match.userId] || [];
      messageStore[match.userId].unshift(match.message);

      messageCache[match.userId].splice(match.messageIdx, 1);

      store('quoteMessageStore', messageStore);
      store('quoteMessageCache', messageCache);

      //TODO configurable responses
      msg.send("remembering " + messageToString(match.message));
    }
    else if (users.length === 0) {
      msg.send(notFoundMessage(username));
    }
    else {
      msg.send(notFoundMessage(text));
    }
  });

  robot.respond(/forget (\w*) (.*)/i, function(msg) {
    var username = msg.match[1];
    var text = msg.match[2];

    var messageStore = retrieve('quoteMessageStore');

    var users = robot.brain.usersForFuzzyName(username);

    var match = findFirstStemMatch(messageStore, text, users);

    if (match) {
      messageStore[match.userId].splice(match.messageIdx, 1);
      store('quoteMessageStore', messageStore);
      msg.send("forgot " + messageToString(match.message));
    }
    else if (users.length === 0) {
      msg.send(notFoundMessage(username));
    }
    else {
      msg.send(notFoundMessage(text));
    }
  });

  robot.respond(/quote (\w*)( (.*))?/i, function(msg) {
    var username = msg.match[1];
    var text = msg.match[3] || '';

    var messageStore = retrieve('quoteMessageStore');

    var users = robot.brain.usersForFuzzyName(username);

    var matches = findAllStemMatches(messageStore, text, users);

    if (matches && matches.length > 0) {
      message = matches[_.random(matches.length - 1)];
      msg.send(messageToString(message));
    }
    else if (users.length === 0) {
      msg.send(notFoundMessage(username));
    }
    else {
      msg.send(notFoundMessage(text));
    }
  });

  robot.respond(/quotemash( (.*))?/i, function(msg) {
    var text = msg.match[2] || '';
    var limit = 10;

    var messageStore = retrieve('quoteMessageStore');

    var matches = findAllStemMatches(messageStore, text);

    var messages = [];

    if (matches && matches.length > 0) {
      while (messages.length < limit && matches.length > 0) {
        messages.push(matches.splice(_.random(matches.length - 1), 1)[0]);
      }

      msg.send.apply(msg, _.map(messages, messageToString));
    }
    else {
      msg.send(notFoundMessage(text));
    }
  });

  robot.hear(/.*/, function(msg) {
    //TODO existing way to test this somewhere??
    if (!hubotMessageRegex.test(msg.message.text)) {
      var userId = msg.message.user.id;
      var messageCache = retrieve('quoteMessageCache');

      messageCache[userId] = messageCache[userId] || [];

      if (messageCache[userId].length === CACHE_SIZE) {
        messageCache[userId].pop();
      }

      //TODO configurable cache size
      messageCache[userId].unshift({
        text: msg.message.text,
        user: msg.message.user
      });

      store('quoteMessageCache', messageCache);
    }
  });
};