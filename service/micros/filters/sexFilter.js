/**
 * Sex FILTER
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "sex"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");

//---Configuration; port, prisma where relevant...---//
const config = require('config');
const HOST = config.get('host');
const PORT = config.get('ports.micros.filters.' + MY_NAME_IS);

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
    isGood = (req.body.check !== undefined) && (rB.check === "M" || rB.check === "F")
    console.log("Good in ", MY_NAME_IS, ": ", isGood)


    res.type('json')
    res.send({
        success : "true",
        content : isGood
    })
})
