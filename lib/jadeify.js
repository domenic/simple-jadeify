"use strict";

var through = require("through");
var jade = require("jade");

module.exports = function (fileName, options) {
    if (!/\.jade$/i.test(fileName)) {
        return through();
    }

    if (typeof options.client === "undefined") {
        options.client = true;
    }

    options.runtimePath = options.runtimePath === undefined ? "jade/runtime" : options.runtimePath;

    var inputString = "";
    return through(
        function (chunk) {
            inputString += chunk;
        },
        function () {
            var self = this;

            options.filename = fileName;

            var result;
            try {
                result = jade.compileClientWithDependenciesTracked(inputString, options);
            } catch (e) {
                self.emit("error", e);
                return;
            }

            result.dependencies.forEach(function (dep) {
                self.emit("file", dep);
            });

            var moduleBody;

            if (options.client) {
                moduleBody = "var jade = require(\"" + options.runtimePath + "\");\n\n" +
                    "module.exports = " + result.body + ";";
            } else {
                moduleBody = "module.exports = " + evalTemplate(result.body, options.locals);                
            }

            self.queue(moduleBody);
            self.queue(null);
        }
    );
};

function evalTemplate(template, locals) {
    /*jshint evil:true */
    var runtime = require("jade/runtime");
    var wrapperFn = eval("(function() { var jade=this; return " + template + ";})");
    var str = wrapperFn.call(runtime)(locals || {});
    return "'" + str.replace(/'/g, "\\'").replace(/\r?\n|\r/g, "") + "';";
}

