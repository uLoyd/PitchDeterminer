const fs = require('fs');
const path = require('path');

fs.readdir(path.join(__dirname, 'tests'), function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
    files.forEach(async function (file) {
        if(path.extname(file) === '.js')
            await require(path.join(__dirname, 'tests', file))();
    });
});