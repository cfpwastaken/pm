#! /usr/bin/env node
require("dotenv").config({ path: __dirname + "/.env" });

// Import a lot of libs
const ora = require('ora'); // Spinners
const fs = require("fs"); // FileSystem
const got = require('got'); // Request Stuff
const request = require('superagent'); // Download ZIPs
const admZip = require("adm-zip"); // Extract Zips n stuff
const bcrypt = require("bcrypt"); // Encrypt password
var spinner;
const { exec } = require("child_process"); // For linking and stuff
const server = process.env.SERVER; // Server for requesting packages.

// Called to install a package
const install = async (package) => {
    // Checks if the package list exists locally. Else it can throw exceptions and we dont want that here.
    if(!fs.existsSync(__dirname + "/list.json")) {
        console.log("List not found. Try refreshing your list.");
        return;
    }
    // If you want to go deeper. Go for it and try reading this horrible code. At least it works duh
    spinner = ora('Downloading').start();
    try {
        const list = require("./list.json");

        if(!list[package]) {
            spinner.text = "Package does not exist. Try refreshing your package list.";
            spinner.fail();
            return;
        }
        
        // __dirname is required for it to be run everywhere.
        if (!fs.existsSync(__dirname + '/packages/')){
            fs.mkdirSync(__dirname + '/packages/');
        }

        const source = `${server}package/${package}.zip`;

        request
        .get(source)
        .on('error', function(error) {
            console.log(error);
        })
        .pipe(fs.createWriteStream(__dirname + "/packages/" + package + ".zip"))
        .on("finish", () => {
            spinner.succeed();

            spinner = ora("Extracting").start();
            try {
                var zip = new admZip(__dirname + "/packages/" + package + ".zip");
                zip.extractAllTo(__dirname + "/packages/" + package, false, true);

                fs.unlinkSync(__dirname + "/packages/" + package + ".zip");
            } catch(e) {
                console.error(e);
                spinner.text = "Could not extract package.";
                spinner.fail();
                return;
            }
            spinner.succeed();

            spinner = ora("Linking").start();
            fs.writeFileSync(__dirname + "/packages/" + package + "/link.bat", "@echo off\ncd /d " + __dirname + "/packages/" + package + "\ncall npm link");
            const list = require("./list.json");
            fs.writeFileSync(__dirname + "/packages/" + package + "/package.json", '{"name":"' + package + '","version":"0.0.0","description":"N/A","main":"index.js","bin":{"' + package + '":"' + list[package].run + '"},"keywords":[],"author":"","license":"ISC"}');
            exec(__dirname + "/packages/" + package + "/link.bat", (error, stdout, stderr) => {
                spinner.succeed();

                spinner = ora("Running install script...");
                if(list[package].install == "") {
                    spinner.succeed();
                    return;
                }
                exec(__dirname + "/packages/" + package + "/" + list[package].install, (error, stdout, stderr) => {
                    spinner.succeed();
                });
            });
        });
    } catch(e) {
        console.error(e);
        spinner.text = "Could not download package.";
        spinner.fail();
        return;
    }
    
};

const uninstall = (package) => {
    spinner = ora("Unlinking").start();
    fs.writeFileSync(__dirname + "/packages/" + package + "/unlink.bat", "@echo off\ncd /d " + __dirname + "/packages/" + package + "\ncall npm unlink");
    exec(__dirname + "/packages/" + package + "/unlink.bat", (error, stdout, stderr) => {
        if(error) {
            spinner.text = "ERROR: " + error.message;
            spinner.fail();
            return;
        }
        if(stderr) {
            spinner.text = "STDERR: " + stderr;
            spinner.fail();
            return;
        }
        spinner.succeed();

        spinner = ora('Uninstalling ' + package).start();
        try {
            fs.unlinkSync(__dirname + "/packages/" + package + ".zip");
        } catch(e) {}
        try {
            var rimraf = require("rimraf");
            rimraf.sync(__dirname + "/packages/" + package);
        } catch(e) {}
        spinner.succeed();
    });
};

const info = async (package) => {
    if(!fs.existsSync(__dirname + "/list.json")) {
        console.log("List not found. Try refreshing your list.");
        return;
    }

    const list = require(__dirname + "/list.json");
    console.log(package + " by " + list[package].author + " - " + list[package].description);
}

const refresh = async () => {
    spinner = ora('Getting Package list').start();
    try {
        const response = await got(server + "/list.json");
        fs.writeFileSync(__dirname + "/list.json", response.body);
        const list = require(__dirname + "/list.json");
    } catch(e) {
        spinner.text = "Could not fetch package list. Servers down?";
        spinner.fail();
        return;
    }
    spinner.succeed();
};

const list = () => {
    const getDirectories = source =>
        fs.readdirSync(source, {withFileTypes: true})
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
    
    var directories = getDirectories(__dirname + "/packages");
    console.log("Installed packages (" + directories.length + "):")

    for(let i = 0; i < directories.length; i++) {
        if((i + 1) == (directories.length)) {
            process.stdout.write(directories[i]);
        } else {
            process.stdout.write(directories[i] + ",")
        }
    }
};

const savehere = (package) => {
    // Checks if the package list exists locally. Else it can throw exceptions and we dont want that here.
    if(!fs.existsSync(__dirname + "/list.json")) {
        console.log("List not found. Try refreshing your list.");
        return;
    }

    // If you want to go deeper. Go for it and try reading this horrible code. At least it works duh
    spinner = ora('Downloading').start();
    try {
        const list = require("./list.json");

        if(!list[package]) {
            spinner.text = "Package does not exist. Try refreshing your package list.";
            spinner.fail();
            return;
        }
        
        if (!fs.existsSync(process.cwd() + '/packages/')){
            fs.mkdirSync(process.cwd() + '/packages/');
        }

        const source = `${server}/package/${package}.zip`;

        request
        .get(source)
        .on('error', function(error) {
            console.log(error);
        })
        .pipe(fs.createWriteStream(process.cwd() + "/packages/" + package + ".zip"))
        .on("finish", () => {
            spinner.succeed();

            spinner = ora("Extracting").start();
            try {
                var zip = new admZip(process.cwd() + "/packages/" + package + ".zip");
                zip.extractAllTo(process.cwd() + "/packages/" + package, false, true);

                fs.unlinkSync(process.cwd() + "/packages/" + package + ".zip");
            } catch(e) {
                console.error(e);
                spinner.text = "Could not extract package.";
                spinner.fail();
                return;
            }
            spinner.succeed();
        });
    } catch(e) {
        console.error(e);
        spinner.text = "Could not download package.";
        spinner.fail();
        return;
    }

};

const publish = () => {
    for(var i = 0; i < 10; i++) console.log("WIP");
    console.log(process.cwd());
    const prompt = require('prompt');
    prompt.start();
    prompt.get(['packagename', 'author', 'description', 'password'], (err, result) => {
        if(err) return;
        const salt = bcrypt.genSaltSync(13);
        const password = bcrypt.hashSync(result.password, salt);
        
        var zip = new admZip();
        zip.addLocalFolder(process.cwd());
        zip.addZipComment(result.packagename + ";" + result.author + ";" + result.description + ";" + password);
        zip.writeZip(process.cwd() + "/" + result.packagename + ".zip");
    });
};

var program = require("commander");

program
    .version("1.0.0")
    .description("Package Manager");

program.command('install <package>').alias('i').description('Install Package').action((package) => {
    install(package);
});

program.command("savehere <packages>").alias("sh").description("Saves package at the current directory").action((package) => {
    savehere(package);
});

program.command('uninstall <package>').alias("u").description("Uninstall Package").action((package) => {
    uninstall(package);
});

program.command("info <package>").alias("inf").alias("in").description("Get information on a package").action((package) => {
    info(package);
});

program.command("refresh").alias("r").description("Refresh package list").action(() => {
    refresh();
});

program.command("publish").description("Publish a package").action(() => {
    publish();
});

program.command("list").alias("l").description("List installed packages").action(() => {
    list();
});

program.parse(process.argv);