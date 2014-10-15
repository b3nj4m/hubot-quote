var fs = require('fs');
var Path = require('path');

module.exports = function(robot) {
  var path = Path.resolve(__dirname, 'scripts');
  fs.exists(path, function(exists) {
    if (exists) {
      fs.readdirSync(path).forEach(function(file) {
        robot.loadFile(path, file);
        robot.parseHelp(Path.join(path, file));
      });
    }
  });
};
