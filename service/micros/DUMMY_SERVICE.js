/**
 * Dummy microservice for implementation.
 * 
 * Use this as a template.
 */

//Name the microservice here.
//Ensure this matches the name for the port in default.json under config.
const MY_NAME_IS = "INSERT_NEW_NAME"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");

//Loads port and host from the config file.
const config = require('config');
const HOST = config.get('host');
const PORT = config.get('ports.micros.filters.' + MY_NAME_IS);

//Create the express applciation and give it the body parser to read inbound information,
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//--Start the service listening on the port. Required for all.--//
app.listen(PORT, () => {
    console.log(`Listening for requests on http://${HOST}:${PORT}`);
});

//The actual functionality goes here.
//Change the argument on "app" to match the HTTP route.
//By defult this accepts POST requests on "/"; the default HTTP endpoint.
app.post('/', async (req, res) => {
    console.log("Recieved POST on " + MY_NAME_IS)
    const rB = req.body
    console.log(rB)

    //Insert some functionality in here.
    //Remember that microservices are granular and single-responsibility.
    //If you need something else... call somebody else! Don't do it yourself!

    //Try to confine your response to a single JSON object for consistency.
    //You can parse this in the reciever with JSON.parse(thing).
    response = {
        content : "Hello from debug service named "
                  + MY_NAME_IS +
                  " on the port " + PORT + "!" 
    }

    //Send responses and close services like this.
    res.type('json')
    res.send({
        content : "Hello from" 
    })
})
