/**
 * Get a patient tuple from the database.
 * 
 * Be sure to check if patient exists first. Alternative methods could also include getting
 * *all* patients from the database that fit the quality which could lead to SQL injection fun.
 * 
 * TODO This should be broken up into "By SSN" and "By Name".
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "getPatientByName"

//ToDO for next time...
//Break GetPatient and DelPatient into "By SSN" and "By Name"
//Ensure they function
//Implement "modify patient", use the existers to check true/false.


//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");
const { PrismaClient } = require('@prisma/client');

//---Configuration; port, prisma where relevant...---//
const config = require('config');
const HOST = config.get('host');
const PORT = config.get('ports.micros.services.' + MY_NAME_IS);

const app = express();
const prisma = new PrismaClient()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//--Start the service listening on the port. Required for all.--//
app.listen(PORT, () => {
    console.log(`Listening for requests on http://${HOST}:${PORT}`);
});


/**
 * Get a patient given any necessary parameters; we optimize the name,
 * but will use the SSN if given as names are somewhat less personal.
 */
app.get('/', async (req, res) => {
    console.log("Recieved GET on" + MY_NAME_IS)

    //Check what we recieved; all responses will be similar unless input is bad.
    console.log("DEBUG/n", req.headers)
    heads = req.headers
    console.log(heads)
    resultant = {}
    //console.log(headers, "itemCount: ", Object(headers).length)
    console.log("FNAME:", heads.fname)
    console.log("LNAME:", heads.sname)

    if (heads.fname !== undefined && heads.sname !== undefined) {
        //span.addEvent("Searched with full name.")
        console.log ("name search")
        resultant = await prisma.patient.findFirst({
            where: {
                name : heads.fname,
                surname : heads.sname
            }
        });
        console.log("Result: ", resultant);
    } else {
        res.statusCode = 400;
        resultant = {"error" : "Search request is missing parameters."}
    }

    if (resultant === null) {
        res.statusCode = 404;
        resultant = {"error" : "No patient found for the given name; " + heads.fname + " " + heads.sname}
    }


    const rB = req.body
    console.log(rB)
    res.type('json')
    res.send(
        resultant
    )
})
