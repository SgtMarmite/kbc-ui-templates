var fs = require("fs");
var rmdir = require('rmdir-recursive').sync;
var _ = require("lodash");

var resourcesFolder = process.argv[2];

var resources = loadResources(resourcesFolder);

materializeResources(resources, "dist");

// Materialize files in build dir
function materializeResources(resources, dir) {
    rmdir(dir, false);
    fs.mkdirSync(dir);
    _.forEach(resources, function(resource, key) {
        console.log("Building", key);

        if (!resource.schemas.params) {
            resource.schemas.params = {};
        }
        if (!resource.schemas.params.definitions) {
            resource.schemas.params.definitions = {};
        }
        
        if (!resource.schemas.api) {
            resource.schemas.api = {};
        }
        if (!resource.schemas.api || !resource.schemas.api.definitions) {
            resource.schemas.api.definitions = {};
        }

        var stringified = JSON.stringify(resource);
        fs.writeFileSync(dir + "/" + key + ".json", stringified);
    });
}

function loadResources(dir) {
    var resources = {};
    var list = fs.readdirSync(dir);
    // load all directories in resources level
    list.forEach(function (file) {
        var stat = fs.statSync(dir + '/' + file);
        if (stat.isDirectory()) {
            resources[file] = {};
            var fullPath = dir + '/' + file;
            var resourceName = file;
            resources[file] = addResource(fullPath, resourceName);
        }
    });
    return resources;
}

function addResource(path, name) {
    var data =  {
        "schemas": addResourceItem(path, name, "schemas"),
        "templates": addResourceItem(path, name, "templates")
    };
    data.templates["config"] = addTemplates(path, name);

    // backward compatibility mode
    return data;
}

function addTemplates(path, name) {
    var data = [];
    if (!fs.existsSync(path + "/templates") || !fs.existsSync(path + "/templates/config")) {
        return;
    }
    console.log("Loading", name, "templates");
    var list = fs.readdirSync(path + "/templates/config")
    if (!list) {
        return data;
    }
    list.forEach(function (file) {
        // skip nonjson files
        if (file.substr(-5) != '.json') {
            return;
        }

        var templateName = file.substr(0, file.length - 5);

        var templateFilePath = path + "/templates/config/" + templateName + ".json";
        var templateMeta = loadJSONFile(templateFilePath);

        try {
            data.push(templateMeta);
        } catch (e) {
            throw "Cannot parse " + filePath + ": " + e;
        }
    });
    return data;

}

function addResourceItem(path, name, resourceType) {
    var data = {};
    if (!fs.existsSync(path + "/" + resourceType)) {
        return data;
    }
    console.log("Loading", name, resourceType);
    // load all directories in resources level
    var list = fs.readdirSync(path + "/" + resourceType)
    if (!list) {
        return data;
    }
    list.forEach(function (file) {
        if (file.substr(-5) != '.json') {
            return;
        }
        var schemaName = file.substr(0, file.length - 5);
        var filePath = path + "/" + resourceType + "/" + file;
        data[schemaName] = loadJSONFile(filePath);
    });
    return data;
}

function loadJSONFile(file) {
    if (file.substr(-5) != '.json') {
        throw file + " not a JSON file";
    }
    try {
        return JSON.parse(fs.readFileSync(file, "utf8").trim());
    } catch (e) {
        throw Error("Cannot parse " + file + ": " + e);
    }
}


