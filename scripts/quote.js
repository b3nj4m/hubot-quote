/**
 * Description:
 *   Remember messages and quote them back
 *
 * Dependencies:
 *   "underscore": "~1.7.0"
 *   "natural": "~0.1.28"
 *
 * Configuration:
 *   HUBOT_QUOTE_CACHE_SIZE=N - cache the last N messages for each user (default 25)
 *   HUBOT_QUOTE_STORE_SIZE=N - remember at most N messages for each user (default 100)
 *
 * Commands:
 *   hubot remember <user> <text> - remember most recent message from <user> containing <text>
 *   hubot quote <user> <text> - quote a random remembered message from <user> containing <text>
 *   hubot forget <user> <text> - forget most recent remembered message from <user> containing <text>
 *   hubot quotemash <text> - quote some random remembered messages containing <text>
 *
 * Author:
 *   b3nj4m
 */

var _ = require('underscore');
var natural = require('natural');

var stemmer = natural.PorterStemmer;

var CACHE_SIZE = process.env.HUBOT_QUOTE_CACHE_SIZE ? parseInt(process.env.HUBOT_QUOTE_CACHE_SIZE) : 25;
var STORE_SIZE = process.env.HUBOT_QUOTE_STORE_SIZE ? parseInt(process.env.HUBOT_QUOTE_STORE_SIZE) : 100;

function uniqueStems(text) {
  return _.unique(stemmer.tokenizeAndStem(text));
}

var messageTmpl = _.template('<%- user.name %>: <%- text %>');

function messageToString(message) {
  return messageTmpl(message);
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

    var stems = uniqueStems(text);

    var messageCache = retrieve('quoteMessageCache');
    var messageStore = retrieve('quoteMessageStore');

    //TODO search for users in messageStore in case they've been removed? (name change implications?)
    var users = robot.brain.usersForFuzzyName(username);

    var message = null;
    var messageIdx = null;

    _.find(users, function(user) {
      if (messageCache[user.id] === undefined) {
        return false;
      }
      else {
        message = _.find(messageCache[user.id], function(msg, idx) {
          messageIdx = idx;
          //cache stems on message
          msg.stems = msg.stems || uniqueStems(msg.text);
          return _.intersection(stems, msg.stems).length === stems.length;
        });

        if (message) {
          messageStore[user.id] = messageStore[user.id] || [];
          messageStore[user.id].unshift(message);

          messageCache[user.id].splice(messageIdx, 1);

          store('quoteMessageStore', messageStore);
          store('quoteMessageCache', messageCache);

          //TODO configurable responses
          msg.send("remembering " + messageToString(message));
        }

        return !!message;
      }
    });

    if (users.length === 0) {
      msg.send("#{username} not found");
    }
    else if (!message) {
      msg.send("#{text} not found");
    }
  });

  robot.respond(/forget (\w*) (.*)/i, function(msg) {
    var username = msg.match[1];
    var text = msg.match[2];

    var messageStore = retrieve('quoteMessageStore');

    var users = robot.brain.usersForFuzzyName(username);

    var message = null;
    var messageIdx = null;

    _.find(users, function(user) {
      if (messageStore[user.id] === undefined) {
        return false;
      }
      else {
        message = _.find(messageStore[user.id], function(msg, idx) {
          messageIdx = idx;
          return msg.text.indexOf(text) !== -1;
        });
        
        if (message) {
          messageStore[user.id].splice(messageIdx, 1);
          store('quoteMessageStore', messageStore);
          //TODO message object with toString
          msg.send("forgot " + messageToString(message));
        }

        return message;
      }
    });

    if (users.length === 0) {
      msg.send("#{username} not found");
    }
    else if (!message) {
      msg.send("#{text} not found");
    }
  });

  robot.respond(/quote (\w*) (.*)/i, function(msg) {
    var username = msg.match[1];
    var text = msg.match[2];

    var stems = uniqueStems(text);

    var messageStore = retrieve('quoteMessageStore');

    var users = robot.brain.usersForFuzzyName(username);

    var messages = null;

    _.find(users, function(user) {
      if (messageStore[user.id] === undefined) {
        return false;
      }
      else {
        messages = _.filter(messageStore[user.id], function(msg) {
          //require all words to be present
          //TODO more permissive search?
          return _.intersection(stems, msg.stems).length === stems.length;
        });

        if (messages && messages.length > 0) {
          message = messages[_.random(messages.length - 1)];
          msg.send(messageToString(message));
        }

        return messages && messages.length > 0
      }
    });

    if (users.length === 0) {
      msg.send("#{username} not found");
    }
    else if (!messages || messages.length === 0) {
      msg.send("#{text} not found");
    }
  });

  robot.respond(/quotemash (.*)/i, function(msg) {
    var text = msg.match[1]
    var limit = 10

    var stems = uniqueStems(text)

    var messageStore = retrieve('quoteMessageStore')

    var matches = _.flatten(_.map(messageStore, function(messages) {
      return _.filter(messages, function(msg) {
        return _.intersection(stems, msg.stems).length === stems.length;
      });
    }));

    var messages = [];

    if (matches && matches.length > 0) {
      while (messages.length < limit && matches.length > 0) {
        messages.push(matches.splice(_.random(matches.length - 1), 1)[0]);
      }

      msg.send.apply(msg, _.map(messages, messageToString));
    }
    else {
      msg.send("#{text} not found");
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
