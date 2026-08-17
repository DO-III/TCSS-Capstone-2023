/**
 * Get a patient tuple from the database.
 * 
 * Be sure to check if patient exists first. Alternative methods could also include getting
 * *all* patients from the database that fit the quality which could lead to SQL injection fun.
 * 
 * TODO This should be broken up into "By SSN" and "By Name".
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "delPatientByName"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");
const { PrismaClient } = require('@prisma/client');

//---Configuration; port, prisma where relevant...---//
const config = require('config');
const { PrismaClientKnownRequestError } = require("@prisma/client/runtime/library");
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
app.delete('/', async (req, res) => {
    //tracer.startActiveSpan (MY_NAME_IS, async (span) => {
    console.log("Recieved DELETE on" + MY_NAME_IS)

    //Check what we recieved; all responses will be similar unless input is bad.
    console.log("DEBUG/n", req.headers)
    headers = JSON.parse(req.headers.args)
    console.log(headers)
    resultant = {}
    //console.log(headers, "itemCount: ", Object(headers).length)
    console.log(headers.fname)
    console.log(headers.sname)

    if (headers.fname !== undefined && headers.sname !== undefined) {
        try {
            console.log ("name delete")
            resultant = await prisma.patient.delete({
                where: {
                    name_surname : {
                        name    : headers.fname,
                        surname : headers.sname
                    }
                }
            });
            console.log("Result: ", resultant);
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    res.statusCode = 400;
                    resultant = {"error" : "Attempted to delete a patient who doesn't exist."}
                  }
            } else {
                res.statusCode = 500;
                resultant = {"error" : "Unknown error..."}
            }
        }
    } else {
        res.statusCode = 400;
        resultant = {"error" : "Search request is missing parameters."}
    }

    const rB = req.body
    console.log(rB)
    res.type('json')
    res.send(
        resultant
    )
})
