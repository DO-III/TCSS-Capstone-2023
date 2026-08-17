/**
 * NAME FILTER
 * 
 * Filter names with uncommon symbols to fight arbitrary injection the best we can.
 * The regex provided here works for all languages and filters names 
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "name"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");

const config = require('config');
const HOST = config.get('host');
const PORT = config.get('ports.micros.filters.' + MY_NAME_IS);
const NAME_REGEX = new RegExp(`^[\p{L} ,.'-]+$`);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//--Start the service listening on the port. Required for all.--//
app.listen(PORT, () => {
    console.log(`Listening for requests on http://${HOST}:${PORT}`);
});


//Just make sure it isn't null for now.
app.post('/', async (req, res) => {
    console.log("Recieved POST on " + MY_NAME_IS)
    const rB = req.body
    console.log(rB)

    //Checking to ensure that something is present.
    isGood = (req.body.check !== undefined) && NAME_REGEX.test(rB.check)
    console.log("Good in ", MY_NAME_IS, ": ", isGood)

    res.type('json')
    res.send({
        content : isGood
    })
})
