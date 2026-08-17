/**
 * State Code Filter
 * 
 * This may look dumb but is an incredibly efficient solution in terms of time and space.
 * Consumes constant space, faster runtime than using a bizarre RegEx.
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "stCod"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");

//---Configuration; port, prisma where relevant...---//
const config = require('config');
const HOST = config.get('host');
const PORT = config.get('ports.micros.filters.' + MY_NAME_IS);
const STATES = "|AA|AE|AK|AL|AP|AR|AS|AZ|CA|CO|CT|DE|DC|FL|FM|GA|GU|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MH|MI|MN|MO|MP|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|PR|PW|RI|SC|SD|TN|TX|UM|UT|VA|VI|VT|WA|WI|WV|WY|"

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//--Start the service listening on the port. Required for all.--//
app.listen(PORT, () => {
    console.log(`Listening for requests on http://${HOST}:${PORT}`);
  });

app.post('/', async (req, res) => {
    console.log("Recieved POST on " + MY_NAME_IS)
    const rB = req.body
    console.log(rB)

    //Checking to ensure that something is present.
    //For the simplest services, this is all that's necessary for now.
    isGood = (req.body.check !== undefined) && (rB.check.length === 2 && STATES.indexOf(rB.check) > -1)
    console.log("Good in ", MY_NAME_IS, ": ", isGood)


    res.type('json')
    res.send({
        success : "true",
        content : isGood
    })
})
