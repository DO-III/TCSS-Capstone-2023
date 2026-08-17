/**
 * Diagnostic Code FILTER
 * 
 * Perform a lookup with ICD-10 API to find a particular diagnosis.
 * If none is returned (or if the inbound term is undefined) then
 * we don't return anything.
 * 
 * Sidenote; this should probably have a cache of recently checked values to
 * avoid abuse.
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "diag"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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

const recentEntries = new Map();

app.post('/', async (req, res) => {
    console.log("Recieved POST on" + MY_NAME_IS)
    const rB = req.body
    const checkMe = req.body.check
    resultant = "";
    console.log(rB)

    //Checking to ensure that something is present and basic formatting.
    //If nothing is here, or if the length is wrong, we don't care about it.
    isGood = (checkMe !== undefined && (checkMe.length >= 3 && checkMe.length <= 7))

    //If we have previously gotten a result there is no need
    //to search once more.
    if (isGood) {
        if (recentEntries.has(checkMe)) {
            resultant = recentEntries.get(checkMe);
        } else {
            apiSez = await fetch('http://icd10api.com?code=' + checkMe)
            apiResp = await apiSez.json()
            isGood = apiResp.Response === "True"
            recentEntries.set(checkMe, isGood)
        }
    }

    console.log("Good in ", MY_NAME_IS, ": ", isGood)

    response = {
        content : isGood
    }


    res.type('json')
    res.send(response)
})
